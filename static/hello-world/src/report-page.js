import React, { useState, useEffect } from 'react';
import { invoke } from '@forge/bridge';
import SignatureCanvas from 'react-signature-canvas';
import { PDFDocument, rgb, PageSizes } from 'pdf-lib';

const ReportPage = () => {
  const [data, setData] = useState(null);
  const [tempoLogs, setTempoLogs] = useState(null);
  const [isButtonDisabled, setButtonDisabled] = useState(false);
  let signpad = {};
  let initialsSignPad = {};

  useEffect(() => {
    invoke('getIssueKey', { "hello": "world" })
      .then(setData).then(() => {
        invoke('getFormattedWorklogs').then(r => {
          try {
            return !!r && JSON.parse(r) || [];
          }
          catch (efo) {
            return [];
          }
        }).then(setTempoLogs).catch(e => console.error("Error loading tempo logs", e));
      }).catch(e => console.error("Error getting issue key", e));
  }, []);

  const clearSignature = () => {
    signpad.clear();
    initialsSignPad.clear();
  };

  const getSignature = async () => {
    setButtonDisabled(true);
    console.log("getSignature:DATA", JSON.stringify(data, null, 2));
    let base64_png_signature = signpad.getTrimmedCanvas().toDataURL('image/png');
    let base64_png_initials = initialsSignPad.getTrimmedCanvas().toDataURL('image/png');
    
    // Assuming the existence of a function to convert base64 to Uint8Array
    const signatureArrayBuffer = await fetch(base64_png_signature).then(res => res.arrayBuffer());
    const initialsArrayBuffer = await fetch(base64_png_initials).then(res => res.arrayBuffer());

    // Assuming the existence of a function to handle the PDF generation
    const pdfBytes = await generatePDF(signatureArrayBuffer, initialsArrayBuffer, "Title", "Name", "Site Name", "Work Order Number");
    
    // Handle submission logic here, e.g., save the PDF
  };

  const generatePDF = async (signature, initials, title, name, siteName, woNumber) => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage(PageSizes.A4);
    page.drawText('Worklog Report', { x: 50, y: page.getHeight() - 50, size: 20 });
    
    // Additional PDF generation logic here, including adding the signature and initials
    // This is a placeholder for the actual implementation

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  };

  return (
    <div>
      <button onClick={() => view.close()}>Close</button>
      <h1>CE REPORT SIGNATURE:{data ? data : 'Loading'}</h1>
      <label>Name <input id="signaturename" name='signaturename' /></label><br />
      <label>Title <input id="signaturetitle" name='signaturetitle' /></label><br />
      <div>
        <SignatureCanvas penColor='black' canvasProps={{ width: 600, height: 200, className: 'sigCanvas' }} ref={(ref) => { signpad = ref; }} />
        <SignatureCanvas penColor='black' canvasProps={{ width: 200, height: 200, className: 'sigCanvas' }} ref={(ref) => { initialsSignPad = ref; }} />
      </div>
      <button onClick={clearSignature}>Clear</button>
      <button disabled={isButtonDisabled} onClick={getSignature}>Save and Create Signed PDF</button>
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
      ) : 'Loading Tempo Logs'}
    </div>
  );
};

export default ReportPage;

