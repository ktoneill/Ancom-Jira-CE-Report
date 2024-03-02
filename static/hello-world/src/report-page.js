import React, { useState, useEffect } from 'react';
import { invoke, view, requestJira } from '@forge/bridge';
import SignatureCanvas from 'react-signature-canvas';
import { PDFDocument, rgb, PageSizes } from 'pdf-lib';
import FormData from 'form-data';
const ReportPage = () => {

    const [issueKey, setIssueKey] = useState(null);
    const [tempoLogs, setTempoLogs] = useState(null);
    const [isButtonDisabled, setButtonDisabled] = useState(false);
    const [context, setContext] = useState(null);
    const [isDetectingContext, setDetectingContext] = useState(true);
    const [globalError, setGlobalError] = useState(null);

    let signpad = {};
    let initialsSignPad = {};

    useEffect(() => {
        setDetectingContext(true);

        // Use the "view" from Forge Bridge to get the context
        // where this React app is running
        view.getContext()
            .then(setContext)
            .finally(() => setDetectingContext(false));
    });

    useEffect(() => {

        invoke('getIssueKey', { "hello": "world" })
            .then(setIssueKey).then(() => {
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

                if (cellIndex == 3 && rowIndex != 0) {
                    try {
                        //console.log("Drawing signature", worklogData[rowIndex-1].signature);
                        if (worklogData[rowIndex-1] && worklogData[rowIndex-1].signature) {
                            page.drawImage(worklogData[rowIndex-1].signature, {
                                x: offsetX,
                                y: startY - cellHeightI,
                                width: columnWidths[cellIndex],
                                height: cellHeightI,
                            });
                        }
                    }
                    catch (e) {
                        //console.error("Error drawing signature", e);
                    }
                }

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
        const formData = new FormData();
        requestJira(`/rest/api/3/issue/${issueKey}`
        ).then(response => {


            console.debug(`Response-forge-jira-issu/e-panel: ${response.status} ${response.statusText}`);
            return response.json();
        }).catch((error) => {
            console.error('Response-forge-jira-issue-panel-Error:', error);
        }).then(async (issueData) => {

            let pdfScan = await getWorkorderScanAttachmentAsBuffer(issueData);
            console.debug("handleSubmission:getWorkorderScanAttachmentAsBuffer:pdfScan");


            if (!tempoLogs) {
                throw "No Tempo logs";
            }
            let adjustedPDF = await addWorklogTableToPdf(pdfScan, tempoLogs, signatureb64, initialsb64, signaturetitle, signaturename, issueData.fields.customfield_10058, issueData.fields.customfield_10038);
            console.debug("handledSubmission:addWorklogTableToPdf:adjustedPDF");

            let savedPDF = new Blob([adjustedPDF], { type: 'application/pdf' });
            formData.append('file', savedPDF, `Report-${issueData.fields.customfield_10038}.pdf`);
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

    const clearSignature = () => {
        signpad.clear();
        initialsSignPad.clear();
    };

    const getSignature = async () => {
        setButtonDisabled(true);
        console.log("getSignature:DATA", JSON.stringify(issueKey, null, 2));
        let base64_png_signature = signpad.getTrimmedCanvas().toDataURL('image/png');
        let base64_png_initials = initialsSignPad.getTrimmedCanvas().toDataURL('image/png');


        // Assuming the existence of a function to handle the PDF generation
        await handleSubmission(issueKey, base64_png_signature, base64_png_initials, document.getElementById('signaturetitle').value, document.getElementById('signaturename').value, tempoLogs);

        // Handle submission logic here, e.g., save the PDF
    };

    async function addWorklogTableToPdf(pdfBytes, allWorklogData, signatureb64, initialsb64, signatureTitle, signatureName, siteName, woNumber) {
        console.log("addWorklogTableToPdf:loading bytes of pdf");
        const pdfDoc = await PDFDocument.load(pdfBytes);
        
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
            for(let record of worklogData){
                record.signature = await pdfDoc.embedPng(record.signature);
            };
            drawTable(workOrderPageNext, worklogData, pngSignatureImage, pngInitialsImage, signatureTitle, signatureName);
            //pdfDoc.moveTo(startX,startY+200);
            workOrderPageNext.drawText(`Site/School: ${siteName}  MR#: ${woNumber} Company Name: ANCOM SYSTEMS`, {
                x: 50,
                y: 10,
                size: 16
            });

        }
        return await pdfDoc.save();
    }





    return (
        <div>
            <button onClick={() => view.close()}>Close</button>
            <h1>CE REPORT SIGNATURE:{issueKey ? issueKey : 'Loading'}</h1>
            <label>Name <input id="signaturename" name='signaturename' /></label><br />
            <label>Title <input id="signaturetitle" name='signaturetitle' /></label><br />
            <div>
                <div style={{ borderColor: "black", borderStyle: "solid", borderWidth: "2px;", backgroundColor: "white", padding: "2em" }}>
                    <SignatureCanvas penColor='black' canvasProps={{ width: 600, height: 200, className: 'sigCanvas', style: { borderColor: "red", borderWidth: "3px", borderStyle: "solid" } }} ref={(ref) => { signpad = ref; }} />
                </div>
                <div style={{ borderColor: "black", borderStyle: "solid", borderWidth: "2px;", backgroundColor: "white", padding: "2em" }}>

                    <SignatureCanvas penColor='black' canvasProps={{ width: 200, height: 200, className: 'sigCanvas', style: { borderColor: "red", borderWidth: "3px", borderStyle: "solid" } }} ref={(ref) => { initialsSignPad = ref; }} />
                </div>
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
                                    <td key={i}>{typeof value == "string" ? value: ''}</td>
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

