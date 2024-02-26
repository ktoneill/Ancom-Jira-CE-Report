import React, { useEffect, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import ConfigPage from './config-page';
import { requestJira, invoke, view } from '@forge/bridge';
import FormData from 'form-data';
import api from '@forge/api';






const fetchIssueData = async (issueIdOrKey) => {
  const res = await api
    .asApp()
    .requestJira(route`/rest/api/3/issue/${issueIdOrKey}`);

  const issueData = await res.json();
  console.debug("fetchIssueData : got data");
  return issueData;
};

const fetchAccountData = async (accountId) => {
  const accountData = await requestJira(`/rest/api/2/user?accountId=${accountId}`, {
    headers: {
      'Accept': 'application/json'
    }
  }).then(response => response.json());
  return accountData;
}

import { PDFDocument, rgb, PageSizes, LineCapStyle } from 'pdf-lib';

function drawTable(page, worklogData, pngSignatureImage, pngInitialsImage, signerTitle, signerPrint) {
  signerTitle = signerTitle || "_____________________";
  signerPrint = signerPrint || "_____________________"
  let startY = page.getHeight() - 50; // Starting Y position
  const cellPadding = 8;
  const cellHeight = 30;
  const columnWidths = [.05, .05, .10, .15, .05, .05, .05, .05, .05, .30].map(per => per * page.getWidth()); // Adjust widths as per your needs

  page.drawText(`12.1 HCPS MAINTENANCE CONTRACTOR SIGN-IN SHEET`, {
    x: 50,
    y: startY,
    size: 20
  });
  startY -= 20;
  page.drawText(`Maintenance Sign-in Sheet: The bill-to department shall verify all information on this Maintenance Contractor Sign-in Sheet.\nWhen project is completed, fax the MR form to the maintenance office that wrote the purchase order.\nAssuring accuracy of work completetion will enable HCPS to issue timely payments.`, {
    x: 50,
    y: startY,
    size: 10,
    lineHeight: 12
  });

  startY -= 30;
  let header = ['Date', 'Time\nIn', 'Worker', 'Signature', 'Time\nOut', 'Lunch', 'Total Reg hrs', 'OT\nhrs', 'JLA\n&\nID\nConfirmed\nby\nschool\nstaff\ninitials', 'HCPS representative signature and print and title'];
  let rowsFromWorklog = worklogData.map(r => { r["hcps-signature"] = `Title  ${signerTitle}    Print  ${signerPrint}\nSignature`; return r; })
    .map(r => { return [r.date, r["time-in"], r["worker"], "", r["time-out"], "", "", "", "", r["hcps-signature"]] });

  let tableData = [header].concat(rowsFromWorklog);

  tableData.forEach((row, rowIndex) => {
    let offsetX = 45; // Starting X position
    var cellHeightI = cellHeight;

    if (rowIndex == 0) {
      cellHeightI = 100;
    }

    row.forEach(async (cell, cellIndex) => {




      // Draw cell text
      page.drawText(cell, {
        x: offsetX + cellPadding,
        y: (startY - cellPadding) - 8,
        size: 10,
        color: rgb(0, 0, 0),
        lineHeight: 10,
        maxWidth: columnWidths[cellIndex]

      });
      // Draw cell border
      page.drawRectangle({
        x: offsetX,
        y: startY - cellHeightI,
        width: columnWidths[cellIndex],
        height: cellHeightI,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });

      if (cellIndex == row.length - 1 && rowIndex != 0) {

        const pngDims = pngSignatureImage.scale(.5);
        page.drawImage(pngSignatureImage, {
          x: offsetX + 80,
          y: startY - (2 * (cellHeightI * .5)),
          width: 80,
          height: 35,
        });

        page.drawImage(pngInitialsImage, {
          x: offsetX - 40,
          y: startY - (2 * (cellHeightI * .5)),
          width: 40,
          height: 20,
        });

      }

      offsetX += columnWidths[cellIndex]; // Move to next cell in the row
    });

    startY -= cellHeightI; // Move to next row
  });



}




async function addWorklogTableToPdf(pdfBytes, allWorklogData, signatureb64, initialsb64, signatureTitle, signatureName, siteName, woNumber) {
  async function addSignatureLine(page) {
    let signatureLineData = {
      x: 20,
      y: 30,
      size: 10,
      color: rgb(0, 0, 0), // Black text
      lineHeight: 12
    };

    ["Signature: ____________________________",
      `Name:     ${signatureName}`, `Date:      ${new Date().toDateString()}`].forEach(seg => {
        page.drawText(seg, signatureLineData);
        signatureLineData.x += 200;
      })

    const pngImageWoPage = await pdfDoc.embedPng(signatureb64);
    pngImageWoPage.scale(0.5);

    page.drawImage(pngImageWoPage, {
      x: 62,
      y: 30,
      width: 100,
      height: 40,
    });
  }
  console.log("addWorklogTableToPdf:loading bytes of pdf");
  const pdfDoc = await PDFDocument.load(pdfBytes);
  var workOrderPage = pdfDoc.getPage(0);

  const halfWhiteBox = {
    x: 0, // x-coordinate of the bottom-left corner of the box
    y: 0, // y-coordinate of the bottom-left corner of the box
    width: Math.floor(workOrderPage.getWidth()), // width of the box
    height: Math.floor(workOrderPage.getHeight() * .35), // height of the box
    color: rgb(1, 1, 1),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,// white color
  };

  const fullWhiteBox = { ...halfWhiteBox, height: Math.floor(workOrderPage.getHeight()) - 20 };


  var reportLines = allWorklogData.map(record => { return [record.date, record.who, record['time-in'], record['time-out'], record.summary].join('\t'); }).reduce(function (p, workorderText) {
    workorderText.replace(/[\r\n]/g, "").match(/[\S\s]{1,100}(?:[\s\.])/ig).forEach((line, lineI) => {
      p.push(`${lineI != 0 ? '\t' : ''}${line}`);

    });
    return p;
  }, []);

  const linesPerPage = 55;
  var currentLine = 0;
  var currentPageI = 0;
  const fontSize = 10;
  const lineHeight = 12;
  while (currentLine <= reportLines.length) {

    const currentPageLinesPerPage = currentPageI == 0 ? 15 : linesPerPage;
    const currentPage = currentPageI == 0 ? workOrderPage : pdfDoc.addPage([PageSizes.Letter[0], PageSizes.Letter[1]]);
    var currentY = (currentPageI == 0 ? halfWhiteBox : fullWhiteBox).height - 40;
    currentPage.drawRectangle(currentPageI == 0 ? halfWhiteBox : fullWhiteBox);
    if (currentPageI != 0) {
      currentPage.drawText(`Site/School: ${siteName}  MR#: ${woNumber} Company Name: ANCOM SYSTEMS`, {
        x: 50,
        y: currentY + 12,
        size: fontSize + 4,
        color: rgb(0, 0, 0), // Black text
      });
      currentY -= lineHeight;
    }

    for (let iLine = 0; iLine < currentPageLinesPerPage; iLine++) {
      const line = reportLines[currentLine] || '';

      currentPage.drawText(line, {
        x: 50,
        y: currentY,
        size: fontSize,
        color: rgb(0, 0, 0), // Black text
      });
      currentY -= lineHeight;

      currentLine++;
      /*if (currentY <= 20){
        iLine = currentPageLinesPerPage;
        break;
      }*/
    }



    addSignatureLine(currentPage);
    currentPageI++;
  }


  const recordsPerPage = 10;
  let numberOfPages = Math.ceil(allWorklogData.length / recordsPerPage);
  for (let pageNumber = 1; pageNumber <= numberOfPages; pageNumber++) {
    const startRecord = (pageNumber - 1) * recordsPerPage;
    let endRecord = startRecord + recordsPerPage;
    if (pageNumber === numberOfPages) endRecord += 1; // Adjust endRecord if it's the last page
    const worklogData = allWorklogData.slice(startRecord, endRecord);

    let workOrderPageNext = pdfDoc.addPage([PageSizes.Letter[1], PageSizes.Letter[0]]);






    const pngSignatureImage = await pdfDoc.embedPng(signatureb64);
    const pngInitialsImage = await pdfDoc.embedPng(initialsb64);
    drawTable(workOrderPageNext, worklogData, pngSignatureImage, pngInitialsImage, signatureTitle, signatureName);
    //pdfDoc.moveTo(startX,startY+200);
    workOrderPageNext.drawText(`Site/School: ${siteName}  MR#: ${woNumber} Company Name: ANCOM SYSTEMS`, {
      x: 50,
      y: 10,
      size: 16
    });

  }




  const modifiedPdfBytes = await pdfDoc.save();
  return new Blob([modifiedPdfBytes], { type: 'application/pdf' });
}













const getWorkorderScanAttachmentAsBuffer = async function (issueData) {
  console.log("getWorkorderScanAttachmentAsBuffer", JSON.stringify(issueData));
  var attachement0 = issueData && issueData.fields && issueData.fields.attachment[0];
  var id = attachement0 && issueData.fields.attachment[0].id;
  console.debug("getWorkorderScanAttachment: id", id);
  const response = await requestJira(`/rest/api/3/attachment/content/${id}`, {
    headers: {
      'Accept': 'application/json'
    }
  });
  console.debug("repsonse", response.status);

  const arrayBuffer = await response.arrayBuffer();
  //const buffer = Buffer.from(arrayBuffer);
  //console.log('headers',JSON.stringify(response.headers));
  //return `data:application/pdf;base64,${buffer.toString('base64')}`
  return arrayBuffer;
}






const handleSubmission = (issueKey, signatureb64, initialsb64, signaturetitle, signaturename, tempoLogs) => {
  console.log("handleSubmission", issueKey);
  var base64_string = signatureb64.replace(/^data:image\/(png|jpg);base64,/, "");

  const arrayBuffer = Uint8Array.from(atob(base64_string), c => c.charCodeAt(0)).buffer;
  const blob = new Blob([arrayBuffer], { type: 'image/png' });
  const formData = new FormData();
  formData.append('file', blob, 'signature.png');
  //formData.append('fileName', "signature.png");
  //formData.append('fileName', "comment");
  //formData.append('minorEdit', "true");


  requestJira(`/rest/api/3/issue/${issueKey}`
  ).then(response => {


    console.debug(`Response-forge-jira-issu/e-panel: ${response.status} ${response.statusText}`);
    return response.json();
  }).catch((error) => {
    console.error('Response-forge-jira-issue-panel-Error:', error);
  }).then(async (issueData) => {

    let pdfScan = await getWorkorderScanAttachmentAsBuffer(issueData);
    console.debug("handleSubmission:getWorkorderScanAttachmentAsBuffer:pdfScan");

    while (tempoLogs.length <= 100) {
      tempoLogs.splice(0, 0, ...tempoLogs);
    }

    if (!tempoLogs) {
      throw "No Tempo logs";
    }
    let adjustedPDF = await addWorklogTableToPdf(pdfScan, tempoLogs, signatureb64, initialsb64, signaturetitle, signaturename, issueData.fields.customfield_10058, issueData.fields.customfield_10038);
    console.debug("handledSubmission:addWorklogTableToPdf:adjustedPDF");
    formData.append('file', adjustedPDF, `Report-${issueData.fields.customfield_10038}.pdf`);
    //formData.append('fileName',"cereport.pdf");
    requestJira(`/rest/api/2/issue/${issueKey}/attachments`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        'X-Atlassian-Token': 'no-check'
      }
    }).then(response => {
      console.debug(`Response-attachment: ${response.status} ${response.statusText}`);
      view.close();
    }).catch((error) => {
      alert('Failed to save:\r\n' + error)
      console.error('Response-attachment:', error);
    });
  })



};



function App() {
  const [data, setData] = useState(null);
  const [context, setContext] = useState(null);
  const [isDetectingContext, setDetectingContext] = useState(true);
  
  const [tempoLogs, setTempoLogs] = useState(null);
  
  
  const [globalError, setGlobalError] = useState(null);
  
  const [isButtonDisabled, setButtonDisabled] = useState(false);

  var issueKey = "";
  var signpad = {};
  var initialsSignPad = {};
  var signname = {};

  function displayGlobalError(e, ee, eee) {
    console.error("displayGlobalError", e, ee, eee);
    //setGlobalError(e);
  }




    // Use the "view" from Forge Bridge to get the context
    // where this React app is running


useEffect(()=>{
    setDetectingContext(true);

    // Use the "view" from Forge Bridge to get the context
    // where this React app is running
    view.getContext()
      .then(setContext)
      .finally(() => setDetectingContext(false));
  });

  useEffect(()=>{
    invoke('getIssueKey', { "hello": "world" })
      .then(setData).then(() => {
        invoke('getFormattedWorklogs').then(r => {
          try {
            return !!r && JSON.parse(r) || [];
          }
          catch (efo) {
            return [];
          }
        }).then(setTempoLogs).catch(displayGlobalError);

      }).catch(e => console.error("getIssueKey", e));
    },[context]);

/*useEffect(()=>{
    if (tempoLogs == null || tempoLogs == undefined) {
      setButtonDisabled(true);
    } else {

      setButtonDisabled(false);
    }
  },[tempoLogs]);*/
  



  function clearSignature() {
    signpad.clear();
  }

  function getSignature() {
    setButtonDisabled(true);
    console.log("getSignature:DATA", JSON.stringify(data, null, 2));
    let base64_png_signature = signpad.getTrimmedCanvas().toDataURL('image/png');
    let base64_png_initials = initialsSignPad.getTrimmedCanvas().toDataURL('image/png');
    handleSubmission(data, base64_png_signature, base64_png_initials, document.getElementById('signaturetitle').value, document.getElementById('signaturename').value, tempoLogs);

  }


  switch (context && context.moduleKey) {
    case 'ancom-jira-ce-report-issue-action': {





      // Render and "AdminPage" if we are in module "admin-page"
      return (
        <div>
          {globalError && (
            <div>
              <h1 style={{ color: "red" }}>Error</h1>
              <pre>{JSON.stringify(globalError, null, '\t')}</pre>
            </div>
          )}
          {!tempoKey && (
            <div>
              <h3 style={{ color: "red" }}>No Tempo Key</h3>
            </div>
          )}

          <button onClick={() => view.close()}>Close</button>
          <h1>CE REPORT SIGNATURE:{data ? data : 'Loading'}</h1>
          <label>Name <input id="signaturename" name='signaturename' /></label><br />
          <label>Title <input id="signaturetitle" name='signaturetitle' /></label><br />
          <label>
            <div>
              <div style={{ borderColor: "black", borderStyle: "solid", borderWidth: "2px;", backgroundColor: "white", padding: "2em" }}>
                <SignatureCanvas penColor='black' canvasProps={{ width: 600, height: 200, className: 'sigcanvas', style: { borderColor: "red", borderWidth: "3px", borderStyle: "solid" } }} ref={(ref) => { signpad = ref; }} />

              </div>
              <div style={{ borderColor: "black", borderStyle: "solid", borderWidth: "2px;", backgroundColor: "white", padding: "2em" }}>
                <SignatureCanvas penColor='black' canvasProps={{ width: 200, height: 200, className: 'sigcanvas', style: { borderColor: "red", borderWidth: "3px", borderStyle: "solid" } }} ref={(ref) => { initialsSignPad = ref; }} />

              </div>
            </div>
          </label>
          <br />
          <button onclick={clearSignature}>Clear</button>
          <button disabled={isButtonDisabled} onClick={getSignature}>Save and Create Signed PDF</button>
          {data ? data : 'Loading...'}
          <div>
            {tempoLogs && Array.isArray(tempoLogs) && tempoLogs[0] ? (
              <table>
                <thead>
                  <tr>
                    {Object.keys(tempoLogs[0]).map((key) => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tempoLogs.map((log, index) => (
                    <tr key={index}>
                      {Object.values(log).map((value, i) => (
                        <td key={i}>{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : tempoLogs && Array.isArray(tempoLogs) ? "No Tempo Logs" : 'Loading Tempo Logs'}

          </div>
        </div>
      );
    }
    case 'ancom-jira-ce-report-admin-page':
      // Render and "IssuePanel" if we are in module "issue-panel"
      return <div>Config Page</div>
      //return <ConfigPage/>
    default:
      return <div>{data}</div>;
  }



}

export default App;

