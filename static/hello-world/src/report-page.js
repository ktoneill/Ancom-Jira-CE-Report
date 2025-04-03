import React, { useState, useEffect, useRef } from 'react';
import { invoke, view, requestJira } from '@forge/bridge';
import SignatureCanvas from 'react-signature-canvas';
import { PDFDocument, rgb, PageSizes } from 'pdf-lib';
import FormData from 'form-data';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.log('Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return <h1>Something went wrong.</h1>;
        }

        return this.props.children;
    }
}

const ReportPage = () => {

    const [issueKey, setIssueKey] = useState(null);
    const [issueData, setIssueData] = useState(null); //issueData.fields.attachment[0].id
    const [tempoLogs, setTempoLogs] = useState(null);
    const [signatureData, setSignatureData] = useState([]);
    const [existingSignature, setExistingSignature] = useState(null);
    const [signPad, setSignPad] = useState(null);
    const [initialsSignPad, setInitialsSignPad] = useState(null);
    const [isButtonDisabled, setButtonDisabled] = useState(false);
    const [context, setContext] = useState(null);
    const [isDetectingContext, setDetectingContext] = useState(true);
    const [globalError, setGlobalError] = useState([]);
    const [isTempoKeyValid, setTempoKeyValid] = useState(null);
    const [jiraSignatures, setJiraSignatures] = useState([]);



    const displayError = (...args) => {
        const error = args.join(', ');
        setGlobalError(prevErrors => [...prevErrors, error]);
        console.error(...args);
    };
    const dummySignature ="data:image/png;base64,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";

    useEffect(() => {
        if (jiraSignatures.length == 0) return;
        var limit = 1000;
        var offset = 0;

        const jiraSignatureFailedMap = {};

        function getFormattedWorklogs({ limit, offset }, $fwl = { worklogs: [], timeSpentSeconds: 0 }) {
            return invoke('getFormattedWorklogs', { limit, offset }).then(fwl => {
                if (fwl && fwl.worklogs && fwl.worklogs.length > 0) {
                    if ($fwl) {
                        $fwl.worklogs = $fwl.worklogs.concat(fwl.worklogs);

                    }
                    offset += limit;
                    if (fwl.worklogs.length == limit) {
                        return getFormattedWorklogs({ limit, offset }, $fwl);
                    } else {
                        return $fwl;
                    }

                } else {
                    return $fwl;
                }

            }).then(fwl => {
                fwl.worklogs.forEach(wl => {
                    let jiraSig = jiraSignatures.find(js => js.accountId == wl.who);
                    if (!jiraSig && !jiraSignatureFailedMap[wl.who]) {
                        jiraSignatureFailedMap[wl.who] = true;
                        invoke(`getJiraUserSignature`,wl.who).then(jiraSig => {
                            if (jiraSig) {
                                setJiraSignatures(prevSignatures => [...prevSignatures, jiraSig]);
                                wl.who = jiraSig.displayName;
                                wl.worker = jiraSig.displayName;
                                wl.signature = dummySignature;
                            } else {
                                setGlobalError(prevErrors => [...prevErrors, `No signature found for ${wl.who}`]);
                            }
                        }
                        ).catch(e => {
                            displayError("Error loading tempo logs", e);
                        });

                    }
                    wl.who = jiraSig?.displayName;
                    wl.worker = jiraSig?.displayName;
                    wl.signature = jiraSig?.b64Signature;
                });
                fwl.timeSpentSeconds = fwl.worklogs.reduce((acc, wl) => acc + wl.timeSpentSeconds, 0);
                return fwl;
            }).catch(e => {
                displayError("Error loading tempo logs", e)
            });
        }
        getFormattedWorklogs({ limit, offset }).then(setTempoLogs);
    }, [jiraSignatures]);


    useEffect(() => {
        if (issueKey) {
            requestJira(`/rest/api/3/issue/${issueKey}`).then(response => {
                console.debug(`Response-forge-jira-issu/e-panel: ${response.status} ${response.statusText}`);
                return response.json();
            }).then(setIssueData);


            invoke('getJiraUserSignatures').then(setJiraSignatures).catch(e => {
                displayError("Error loading jira signatures", e);
            })
        }
    }, [issueKey]);

    useEffect(() => {
        const fetchData = async () => {
            if (issueData) {
                try {
                    const signatures = getSignaturesInIssueData(issueData);
                    setExistingSignature(signatures);
                    const storedSignatures = await getStoredSignatureAndInitials(issueData);
                    setSignatureData(storedSignatures);
                } catch (e) {
                    displayError("Error loading signature and initials", e);
                }
            }
        };

        fetchData();
    }, [issueData]);

    useEffect(() => {
        if (signatureData && signPad) {
            signPad.fromDataURL(signatureData.signature);
        }
        if (signatureData && initialsSignPad) {
            initialsSignPad.fromDataURL(signatureData.initials);
        }
    }, [signatureData, signPad, initialsSignPad]);


    useEffect(() => {
        context && context.extension && context.extension.issue && setIssueKey(context.extension.issue.key);
    }, [context]);

    useEffect(() => {
        setDetectingContext(true);

        // Use the "view" from Forge Bridge to get the context
        // where this React app is running
        view.getContext()
            .then(setContext)
            .finally(() => setDetectingContext(false));
        //});

        //useEffect(() => {
        //invoke('testTempoKey', { "hello": "world" }).then(r=>r.json()).then(setTempoKeyValid).catch(e => { displayError("Error testing tempo key", e);  });

    }, []);

    const getSignaturesInIssueData = (issueData) => {
        if (issueData && issueData.fields && Array.isArray(issueData.fields.attachment)) {
            let signatureAttachmentId = issueData.fields.attachment.find(a => a.filename == "signature.png");
            let initialsAttachmentId = issueData.fields.attachment.find(a => a.filename == "initials.png");
            return { signature: signatureAttachmentId, initials: initialsAttachmentId };
        }
        return { signature: null, initials: null };
    };

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
            .map(r => {
               
                return [r['date'].replace(/\D\d\d\d\d$/,""), r["time-in"], r["worker"], "", r["time-out"], "", "", "", "", r["hcps-signature"]] 
            });

        let tableData = [header].concat(rowsFromWorklog);

        tableData.forEach((row, rowIndex) => {
            let offsetX = 45; // Starting X position
            var cellHeightI = cellHeight;

            if (rowIndex == 0) {
                cellHeightI = 100;
            }

            row.forEach(async (cell, cellIndex) => {
                if (cellIndex == 0) cell = cell.replace(/\D\d\d\d\d$/, "");



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
                        if (worklogData[rowIndex - 1] && worklogData[rowIndex - 1].signature) {
                            page.drawImage(worklogData[rowIndex - 1].signature, {
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
                    try {
                        page.drawImage(pngSignatureImage, {
                            x: offsetX + 80,
                            y: startY - (2 * (cellHeightI * .5)),
                            width: 80,
                            height: 35,
                        });
                    }
                    catch (e) {
                        displayError("failed to draw signature", e);
                    }
                    try {
                        page.drawImage(pngInitialsImage, {
                            x: offsetX - 40,
                            y: startY - (2 * (cellHeightI * .5)),
                            width: 40,
                            height: 20,
                        });
                    }
                    catch (e) {

                        displayError("failed to draw initials", e);

                    }

                }

                offsetX += columnWidths[cellIndex]; // Move to next cell in the row
            });

            startY -= cellHeightI; // Move to next row
        });



    }

    const getAttachmentAsBase64 = async function (attachmentId) {
        const response = await requestJira(`/rest/api/3/attachment/content/${attachmentId}`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        let base64;
        if (response.headers.get('Content-Type').includes('text')) {
            const textData = await response.text();
            base64 = btoa(textData);
        } else {
            const blobData = await response.blob();
            base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64data = reader.result.split(',')[1];
                    resolve(base64data);
                };
                reader.readAsDataURL(blobData);
            });
        }
        return `data:image/png;base64,${base64}`;
    };


    const getStoredSignatureAndInitials = async function (issueData) {
        var { signatureAttachmentId, initialsAttachmentId } = getSignaturesInIssueData(issueData);
        var signature = null;
        var initials = null;
        if (signatureAttachmentId) {
            signature = await getAttachmentAsBase64(signatureAttachmentId.id);
        }
        if (initialsAttachmentId) {
            initials = await getAttachmentAsBase64(initialsAttachmentId.id);
        }
        return { signature, initials };

    };

    const getWorkorderScanAttachmentAsBuffer = async function (issueData, scanPDFattachmentId) {
        console.log("getWorkorderScanAttachmentAsBuffer", JSON.stringify(issueData));

        var attachement0 = issueData?.fields?.attachment?.[0];
        var id = scanPDFattachmentId || attachement0?.id;
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

    const handleSubmission = async (issueKey, signatureb64, initialsb64, signaturetitle, signaturename, tempoLogs, scanPDFattachmentId) => {
        if (!issueData) {
            throw new Error("Issue data is not available");
        }

        console.log("handleSubmission", issueKey);

        let pdfScan = await getWorkorderScanAttachmentAsBuffer(issueData, scanPDFattachmentId);
        console.debug("handleSubmission:getWorkorderScanAttachmentAsBuffer:pdfScan");

        if (!tempoLogs) {
            throw new Error("No Tempo logs");
        }
        let adjustedPDF = await addWorklogTableToPdf(pdfScan, tempoLogs.worklogs, signatureb64, initialsb64, signaturetitle, signaturename, issueData.fields.customfield_10058, issueData.fields.customfield_10038);
        console.debug("handledSubmission:addWorklogTableToPdf:adjustedPDF");


        const pdfFormData = new FormData();

        let savedPDF = new Blob([adjustedPDF], { type: 'application/pdf' });
        pdfFormData.append('file', savedPDF, `Report-${issueData.fields.customfield_10038}.pdf`);
        //let signatureBlob = new Blob([signatureb64], { type: 'image/png' });
        //formData.append('filesignature', signatureBlob, 'initials.png');
        //let initialsBlob = new Blob([initialsb64], { type: 'image/png' });
        //formData.append('fileinitials', initialsBlob, 'initials.png');
        //formData.append('fileName',"cereport.pdf");
        requestJira(`/rest/api/2/issue/${issueKey}/attachments`, {
            method: 'POST',
            body: pdfFormData,
            headers: {
                'Accept': 'application/json',
                'X-Atlassian-Token': 'no-check'
            }
        }).then(response => {
            console.debug(`Response-attachment: ${response.status} ${response.statusText}`);
            view.close();
        }).catch((error) => {
            alert('Failed to save:\r\n' + error)
            displayError('Response-attachment:', error);
        });

        const initialsFormData = new FormData();
        const initialsbyteCharacters = atob(initialsb64.split(',')[1]);
        const initialsbyteNumbers = new Array(initialsbyteCharacters.length);
        for (let i = 0; i < initialsbyteCharacters.length; i++) {
            initialsbyteNumbers[i] = initialsbyteCharacters.charCodeAt(i);
        }
        const initialsbyteArray = new Uint8Array(initialsbyteNumbers);
        let initialsBlob = new Blob([initialsbyteArray], { type: 'image/png' });
        initialsFormData.append('file', initialsBlob, 'initials.png');
        requestJira(`/rest/api/2/issue/${issueKey}/attachments`, {
            method: 'POST',
            body: initialsFormData,
            headers: {
                'Accept': 'application/json',
                'X-Atlassian-Token': 'no-check'
            }
        }).then(response => {
            console.debug(`Response-attachment: ${response.status} ${response.statusText}`);
            view.close();
        }).catch((error) => {
            alert('Failed to save:\r\n' + error)
            displayError('Response-attachment:', error);
        });


        const signatureFormData = new FormData();
        const byteCharacters = atob(signatureb64.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        let signatureBlob = new Blob([byteArray], { type: 'image/png' });
        signatureFormData.append('file', signatureBlob, 'signature.png');
        //let initialsBlob = new Blob([initialsb64], { type: 'image/png' });
        //formData.append('fileinitials', initialsBlob, 'initials.png');
        //formData.append('fileName',"cereport.pdf");
        requestJira(`/rest/api/2/issue/${issueKey}/attachments`, {
            method: 'POST',
            body: signatureFormData,
            headers: {
                'Accept': 'application/json',
                'X-Atlassian-Token': 'no-check'
            }
        }).then(response => {
            console.debug(`Response-attachment: ${response.status} ${response.statusText}`);
            view.close();
        }).catch((error) => {
            alert('Failed to save:\r\n' + error)
            displayError('Response-attachment:', error);
        });




    };

    const clearSignature = () => {
        signPad.clear();
        initialsSignPad.clear();
    };

    const getSignature = async () => {
        setButtonDisabled(true);
        console.log("getSignature:DATA", JSON.stringify(issueKey, null, 2));
        let base64_png_signature = signPad.getTrimmedCanvas().toDataURL('image/png');
        let base64_png_initials = initialsSignPad.getTrimmedCanvas().toDataURL('image/png');


        // Assuming the existence of a function to handle the PDF generation
        await handleSubmission(issueKey, base64_png_signature, base64_png_initials, document.getElementById('signaturetitle').value, document.getElementById('signaturename').value, tempoLogs, document.getElementById('scanpdfattachmentid').value);

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


        // This section processes the worklog data into a format suitable for PDF rendering
        var reportLines = allWorklogData.map(record => {
            // For each worklog record, create a tab-separated string of key information
            return [record.date, record.who, record['time-in'], record['time-out'], record.summary].join('\t');
        }).reduce(function (p, workorderText) {
            // For each workorder text:
            // 1. Remove any carriage returns or newlines
            // 2. Split the text into chunks of up to 90 characters, respecting word boundaries
            // 3. Add each chunk as a new line, with subsequent chunks indented
            workorderText.replace(/[\r\n]/g, "").match(/[\S\s]{1,90}(?:[\s\.]*)/ig).forEach((line, lineI) => {
                p.push(`${lineI != 0 ? '\t' : ''}${line}`);
            });
            return p;
        }, []);
        // The result is an array of strings, each representing a line in the report

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
            for (let record of worklogData) {
                try {
                    record.signature = await pdfDoc.embedPng(record.signature);
                }
                catch (ee) {
                    displayError("Error embedding signature", ee, record);
                }
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
        <div style={{ padding: "2em" }}>
            <button onClick={() => view.close()}>Close</button>
            <h1>CE REPORT SIGNATURE: {issueData ? issueData.fields.customfield_10038 : 'Loading'}</h1>
            <div style={{ marginTop: '2em', padding: '1em', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f0f0f0', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                <div>
                    <p><strong>Total Hours:</strong> {tempoLogs ? parseFloat(tempoLogs.timeSpentSeconds) / 3600 : 'Loading...'} hours</p>
                </div>

            </div>
            {globalError && Array.isArray(globalError) && globalError.length != 0 &&
                <div>
                    <h3 style={{ color: "red" }}>Errors</h3>
                    <ul>
                        {globalError.map((error, index) => (
                            <li key={index}>{error}</li>
                        ))}

                    </ul>
                </div>
            }

            <div style={{ display: 'flex', flexDirection: 'column', padding: '1em', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f0f0f0', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                <table style={{ width: '100%', marginBottom: '1em' }}>
                    <tbody>
                        <tr>
                            <td style={{ fontWeight: 'bold', padding: '0.5em', width: '16.66%' }}>Name:</td>
                            <td style={{ padding: '0.5em' }}>
                                <input id="signaturename" name='signaturename' style={{ width: '100%', border: '1px solid #ccc', borderRadius: '4px', padding: '0.5em' }} />
                            </td>
                        </tr>
                        <tr>
                            <td style={{ fontWeight: 'bold', padding: '0.5em' }}>Title:</td>
                            <td style={{ padding: '0.5em' }}>
                                <input id="signaturetitle" name='signaturetitle' style={{ width: '100%', border: '1px solid #ccc', borderRadius: '4px', padding: '0.5em' }} />
                            </td>
                        </tr>
                        <tr>
                            <td style={{ fontWeight: 'bold', padding: '0.5em' }}>Signature:</td>
                            <td style={{ padding: '0.5em' }}>
                                <div style={{ width: '100%', border: '1px solid #ccc', padding: '0.5em', backgroundColor: 'white', borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                    <SignatureCanvas penColor='black' canvasProps={{ width: 500, height: 150, className: 'sigCanvas', style: { border: '2px solid #ccc', borderRadius: '4px' } }} ref={setSignPad} />
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style={{ fontWeight: 'bold', padding: '0.5em' }}>Initials:</td>
                            <td style={{ padding: '0.5em' }}>
                                <div style={{ width: '100%', border: '1px solid #ccc', padding: '0.5em', backgroundColor: 'white', borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                    <SignatureCanvas penColor='black' canvasProps={{ width: 150, height: 150, className: 'sigCanvas', style: { border: '2px solid #ccc', borderRadius: '4px' } }} ref={setInitialsSignPad} />
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style={{ fontWeight: 'bold', padding: '0.5em' }}>Scan PDF Attachment:</td>
                            <td style={{ padding: '0.5em' }}>
                                <select id="scanpdfattachmentid" name='scanpdfattachmentid' style={{ width: '100%', border: '1px solid #ccc', borderRadius: '4px', padding: '0.5em' }}>
                                    {issueData && issueData.fields && issueData.fields.attachment && issueData.fields.attachment.filter(a=>/pdf/i.test(a.filename)).map((attachment, index) => (
                                        <option key={index} value={attachment.id}>{attachment.filename}</option>
                                    ))}
                                </select>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button onClick={clearSignature} style={{ marginRight: '1em', padding: '0.5em 1em', border: 'none', borderRadius: '4px', backgroundColor: '#007bff', color: 'white', cursor: 'pointer' }}>Clear</button>
                    <button disabled={isButtonDisabled} onClick={getSignature} style={{ padding: '0.5em 1em', border: 'none', borderRadius: '4px', backgroundColor: isButtonDisabled ? '#ccc' : '#28a745', color: 'white', cursor: isButtonDisabled ? 'not-allowed' : 'pointer' }}>Save and Create Signed PDF</button>
                </div>
            </div>

            {tempoLogs && tempoLogs.worklogs && Array.isArray(tempoLogs.worklogs) && tempoLogs.worklogs[0] ? (
                <table>
                    <thead>
                        <tr>
                            {["who", "worker", "date", "time-in", "time-out", "summary"].map((key) => (
                                <th key={key}>{key}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {tempoLogs.worklogs.map((log, index) => (
                            <tr key={index}>
                                {Object.entries(log).filter(([k, v]) => ["who", "worker", "date", "time-in", "time-out", "summary"].indexOf(k) != -1).map(([key, value], i) => (
                                    <td key={i}>{typeof value == "string" ? value : ''}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : tempoLogs && tempoLogs.worklogs && Array.isArray(tempoLogs.worklogs) ? 'No Logs retrieved' : 'Loading Tempo Logs'}
        </div>
    );
};

// Wrap your main component with this error boundary
const App = () => (
    <ErrorBoundary>
        <ReportPage />
    </ErrorBoundary>
);

export default App;


