const createCEreport = async function createCEreport(issueIdOrKey) {
    console.log("creating CE Report", issueIdOrKey);
    // This sample uses Atlassian Forge and the `form-data` library.
    // https://developer.atlassian.com/platform/forge/
    // https://www.npmjs.com/package/form-data
  
    var issueData = await fetchIssueData(issueIdOrKey);
    var workorderScan = await getWorkorderScanAttachmentAsBase64(issueData);
    //return await addAttachmentBackend(issueIdOrKey,workorderScan,"reupload.jpeg");
    //var sampleImage = "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAIAAAB7GkOtAAAHQklEQVR4nOzXMRECQRQE0S1qY2wQkxKSIABdqCA4NefpZPyg31MwWdfsdb4WVH0ev+kJMOY2PQCAGQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFH7//xOb4Ax7+M+PQHGeAAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFECABAlAABRAgAQJQAAUQIAECUAAFFXAAAA///hpQgl02hgQwAAAABJRU5ErkJggg==";
    var pdfReport = await makePDF(issueData, workorderScan);
    return await addAttachmentBackend(issueIdOrKey, pdfReport, "invoice-" + issueIdOrKey + ".pdf");
  }

  async function addAttachmentBackend(issueKey, decodedFile, fileName) {

    const body = new FormData();
    body.append('file', decodedFile, fileName);
    const response = await fetch(`/rest/api/3/issue/${issueKey}/attachments`, {
      method: 'POST',
      headers: {
        'X-Atlassian-Token': 'nocheck',
        Accept: 'application/json'
      },
      body: body
    });
    console.debug("finished response");
  
    return await response.json();
  }

  function makePDF(issueData, b64Image) {
    const doc = new jsPDF('p', 'pt', 'letter');
  
  
    console.debug("starting pdf for issue", issueData.key)
  
  
    // Create a document
  
    console.debug("created new PDF document", b64Image.substring(0, 100));
    //const b64Image = workorderScan.toString("base64");
    //var b64Image = 'data:image/jpeg;base64,'+workorderScan.toString("base64");
    //console.debug("b64", );
  
  
    doc.addImage(b64Image, "JPEG", 0, 0, 612, 700);
  
    //doc.addPage();
    doc.moveTo(0, 1000);
    autoTable(doc, {
      head: [['Date', 'Time In', 'Time Out', 'Worker', 'Summary']],
      margin: { top: 450 },
      body: issueData.fields.worklog.worklogs.map(mapWorkLog).map(r => { return [r.date, r["time-in"], r["time-out"], r["worker"], r["summary"]] }),
    })
  
  
    doc.addPage(null, 'l');
    doc.setFontSize(16);
    doc.text("12.1 HCPS MAINTENANCE CONTRACTOR SIGN-IN SHEET", 30, 30);
    doc.setFontSize(10);
    doc.text(["Maintenance Sign-in Sheet: The bill-to department shall verify all information on this Maintenance Contractor Sign-in Sheet.", "When project is completed, fax the MR form to the maintenance office that wrote the purchase order.", "Assuring accuracy of work completetion will enable HCPS to issue timely payments."], 30, 40)
  
    autoTable(doc, {
      head: [['Date', 'Time In', 'Worker', 'Signature', 'Time Out', 'Lunch', 'Total Reg hrs', 'OT hrs', 'JLA & ID Confirmed by school staff initials', 'HCPS representative signature and print and title']],
      margin: { top: 80 },
      body: issueData.fields.worklog.worklogs.map(mapWorkLog).map(r => { r["hcps-signature"] = "Title____________Print____________ Signature"; return r; })
        .map(r => { return [r.date, r["time-in"], r["worker"], "", r["time-out"], "", "", "", "", r["hcps-signature"]] })
    });
  
  
  
  
    // Add another page
    /*
      ; (async function () {
        // table
        const table = {
          title: "12.1 HCPS MAINTENANCE CONTRACTOR SIGN-IN SHEET",
          subtitle: "Maintenance Sign-in Sheet: The bill-to department shall verify all information on this Maintenance Contractor Sign-in Sheet. When project is completed, fax the MR form to the maintenance office that wrote the purchase order. Assuring accuracy of work completetion will enable HCPS to issue timely payments.",
          headers: [
            { label: "Date", property: 'date', width: 40, renderer: null },
            { label: "Time In", property: 'time-in', width: 40, renderer: null },
            { label: "Time Out", property: 'time-out', width: 40, renderer: null },
            { label: "Worker", property: 'worker', width: 80, renderer: null },
            { label: "Summary", property: 'summary', width: 280, renderer: null },
    
          ],
          // complex data
          datas: issueData.fields.worklog.worklogs.map(mapWorkLog)
    
        };
        // the magic
    
        doc.moveDown(30);
        doc.table(table, {
          minRowHeight: 15, align: "center", valign: "bottom",
          prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
          prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
            doc.font("Helvetica").fontSize(10);
            indexColumn === 0 && doc.addBackground(rectRow, 'blue', 0.15);
    
          },
        });
        doc.fillColor('white');
    
      })();
    
    
      ; (async function () {
        // table
        const table = {
          title: "12.1 HCPS MAINTENANCE CONTRACTOR SIGN-IN SHEET",
          subtitle: "Maintenance Sign-in Sheet: The bill-to department shall verify all information on this Maintenance Contractor Sign-in Sheet. When project is completed, fax the MR form to the maintenance office that wrote the purchase order. Assuring accuracy of work completetion will enable HCPS to issue timely payments.",
          headers: [
            { label: "Date", property: 'date', width: 40, renderer: null },
            { label: "Time In", property: 'time-in', width: 40, renderer: null },
            { label: "Worker", property: 'worker', width: 80, renderer: null },
            { label: "Signature", property: 'worker-signature', width: 80, renderer: null },
            { label: "Time Out", property: 'time-out', width: 40, renderer: null },
            { label: "Lunch", property: 'lunch', width: 40, renderer: null },
            { label: "Total Reg hrs", property: 'total-reg-hrs', width: 40, renderer: null },
            { label: "OT hrs", property: 'total-ot-hrs', width: 40, renderer: null },
            { label: "JLA & ID Confirmed by school staff initals", property: 'jla', width: 40, renderer: null },
            { label: "HCPS representative signature and print and title", property: 'hcps-signature', width: 200, renderer: null, align: "left" }
    
          ],
          // complex data
          datas: issueData.fields.worklog.worklogs.map(mapWorkLog).map(r => { r["hcps-signature"] = "Title____________Print____________ Signature"; return r; })
    
        };
        // the magic
        doc.addPage()
        doc.rotate(-90, { origin: [396, 396] });
        doc.table(table, {
          minRowHeight: 15,
          prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
          prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
            doc.font("Helvetica").fontSize(10);
            indexColumn === 0 && doc.addBackground(rectRow, 'blue', 0.15);
    
          },
        });
        
    
    
        // done!
        
      })();
        
      //doc.end();
      //return doc;
      */
  
  
  
  
    return Buffer.from(doc.output('arraybuffer'), 'ascii');
  
  }

  function mapWorkLog(worklog) {
    var started = new Date(worklog.started);
    var ended = new Date(worklog.started);
    ended.setSeconds(worklog.timeSpentSeconds);
    var summary = worklog.comment && worklog.comment.content && worklog.comment.content[0] && worklog.comment.content[0].content[0] && worklog.comment.content[0].content[0].text || worklog.comment;
    return {
      who: worklog.author.displayName,
      worker: worklog.author.displayName,
      from: started.toLocaleString(),
      "date": `${started.getMonth() + 1}/${started.getDate()}`,
      "time-in": started.toTimeString().replace(/(\d\d:\d\d):\d\d.*/, "$1"),
      to: ended.toLocaleString(),
      "time-out": ended.toTimeString().replace(/(\d\d:\d\d):\d\d.*/, "$1"),
      summary: summary
    };
  
  }