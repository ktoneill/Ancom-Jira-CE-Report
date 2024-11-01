import Resolver from '@forge/resolver';
import api, { route, requestJira } from "@forge/api";
import { storage } from '@forge/api';

async function getTempoKey() {
  let tempoAuthData = await storage.getSecret('tempo-auth-data');
  if (!tempoAuthData || !tempoAuthData.access_token) {
    console.error("No Tempo auth data or access token available.");
    return null;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime >= tempoAuthData.timestamp + tempoAuthData.expires_in - 300) { // Refresh 5 minutes before expiry
    console.log("Token is about to expire, refreshing...");
    tempoAuthData = await checkAndRenewOAuthToken();
    if (!tempoAuthData) {
      console.error("Failed to refresh token.");
      return null;
    }
  }

  return tempoAuthData.access_token;
}

const ancomreportresolver = new Resolver();

async function checkAndRenewOAuthToken() {
  let tempoAuthData = await storage.getSecret('tempo-auth-data');

  const urlBody = new URLSearchParams();
  urlBody.append("grant_type", "refresh_token");
  urlBody.append("redirect_uri", tempoAuthData.redirect_uri);
  urlBody.append("refresh_token", tempoAuthData.refresh_token);
  urlBody.append("client_id", tempoAuthData.client_id);
  urlBody.append("client_secret", tempoAuthData.client_secret);

  try {
    const response = await api.fetch("https://api.tempo.io/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: urlBody.toString(),
      redirect: 'follow'
    });

    if (!response.ok) {
      console.error("Failed to renew OAuth token:", JSON.stringify({ body: urlBody.toString(), status: response.statusText }));
      throw new Error(response.statusText);
    }

    const tokenData = await response.json();
    console.log("Renewed OAuth Token Data", JSON.stringify(tokenData));

    const updatedAuthData = {
      ...tempoAuthData,
      ...tokenData,
      timestamp: Math.floor(Date.now() / 1000)
    };
    await storage.setSecret('tempo-auth-data', updatedAuthData);

    return updatedAuthData;
  } catch (error) {
    console.error("Error renewing OAuth token", error);
    throw new Error(error);
  }
}

ancomreportresolver.define('getText', (req) => {
  console.debug("getText: req", req);
  console.debug("getText: issueData", req.context.extension.issue);
  return "Issue data";
});

ancomreportresolver.define('getTempoAuthData', async (req) => {
  return (await storage.getSecret('tempo-auth-data')) || { "client_id": "", "client_secret": "", "grant_type": "", "redirect_uri": "", "code": "", "refresh_token": "" };
});

ancomreportresolver.define('setTempoAuthData', async ({ payload }) => {
  let tempoAuthData = await storage.getSecret('tempo-auth-data');

  let grantType = payload.refresh_token ? "refresh_token" : "authorization_code";
  let urlBody = new URLSearchParams();
  urlBody.append("code", payload.code);
  urlBody.append("client_id", payload.client_id);
  urlBody.append("client_secret", payload.client_secret);
  urlBody.append("grant_type", grantType);
  urlBody.append("redirect_uri", payload.redirect_uri);
  urlBody.append("refresh_token", payload.refresh_token);
  urlBody.append("authorization_code", payload.code);
  urlBody.append("access_token", payload.access_token);


  try {
    const response = await api.fetch("https://api.tempo.io/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: urlBody.toString(),
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const tokenData = await response.json();
    console.debug("tokenData", JSON.stringify(tokenData));

    const mergedPayload = {
      ...payload,
      ...tokenData,
      timestamp: Math.floor(Date.now() / 1000)
    };
    await storage.setSecret('tempo-auth-data', mergedPayload);

    return mergedPayload;
  } catch (error) {
    console.error("setTempoAuthData", error);
    throw new Error(error);
  }
});

ancomreportresolver.define('renewTempoKey', async (req) => {

  return await checkAndRenewOAuthToken();
});

ancomreportresolver.define('getTempoKey', async (req) => {
  return await getTempoKey();
});

ancomreportresolver.define('testTempoKey', async ({ payload }) => {
  let token = await getTempoKey();
  if (!token) {
    throw new Error("No valid Tempo key available");
  }
  console.debug("testTempoKey", token);
  var requestOptions = {
    method: 'GET',
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    redirect: 'follow'
  };

  try {
    let response = await api.fetch("https://api.tempo.io/4/globalconfiguration", requestOptions);
    if (response.status != 200) {
      throw new Error("Failed to get tempo configuration: " + response.statusText);
    }
    let tempoTestResults = await response.json();
    //console.debug("tempoTestResults", tempoTestResults);
    return tempoTestResults || 'Fail...';
  }
  catch (ee) {
    console.error("Failed to test results", ee);
    throw new Error("Tempo test failed: " + ee.message);
  }
});

ancomreportresolver.define('setTempoKey', async ({ payload }) => {
  // This function is no longer needed as we're managing the token through OAuth
  let tempoAuthData = await storage.getSecret('tempo-auth-data');
  if (!tempoAuthData) {
    console.error("No tempo auth data available.");
    return null;
  }
  let r = await storage.setSecret('tempo-auth-data', { ...tempoAuthData, access_token: payload });
  let tempoAuthData2 = await storage.getSecret('tempo-auth-data');
  return tempoAuthData2.access_token;
});

// ... rest of the code remains unchanged

const getFormattedWorklogs = async (req) => {
  var limit = req.payload.limit || 50;
  var offset = req.payload.offset || 0;
  const tempoKey = await getTempoKey();
  if (!tempoKey) {
    throw new Error("No valid Tempo key available");
  }

  const requestOptions = {
    method: 'GET',
    headers: {
      "Authorization": `Bearer ${tempoKey}`,
      "Content-Type": "application/json"
    },
    redirect: 'follow'
  };

  try {
    const response = await api.fetch(`https://api.tempo.io/4/worklogs?issueId=${req.context.extension.issue.id}&limit=${limit}&offset=${offset}`, requestOptions);
    if (!response.ok) {
      throw new Error(`Failed to fetch worklogs: ${response.statusText}`);
    }

    const worklogsData = await response.json();

    // Format the worklogs
    const formattedWorklogs = worklogsData.results.map(worklog => {
      const startDateTime = new Date(worklog.startDate + 'T' + worklog.startTime);
      const endDateTime = new Date(startDateTime.getTime() + worklog.timeSpentSeconds * 1000);
      var started = new Date(worklog.startDate);
      started.setTime(worklog.startTime);
      var ended = new Date(worklog.startDate);
      ended.setSeconds(worklog.timeSpentSeconds);
      ["who", "worker", "date", "time-in", "time-out", "summary"]
      return {
        who: worklog.author.accountId,
        worker: worklog.author.accountId,
        date: worklog.startDate,
        'time-in': startDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        'time-out': endDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        summary: worklog.description || 'No description provided',
        started,
        ended,
        ...worklog
      };
    });

    return { worklogs: formattedWorklogs };
  } catch (error) {
    console.error("Error fetching worklogs:", error);
    throw new Error(`Failed to fetch worklogs: ${error.message}`);
  }
}

// Add a new resolver for getting formatted worklogs
ancomreportresolver.define('getReportData', async (req) => {
  throw new Error("getReportData is not implemented");
  try {
    return await getFormattedWorklogs(req);
  } catch (error) {
    console.error("Error in getFormattedWorklogs resolver:", error);
    return {
      error: true,
      message: error.message || "An error occurred while fetching formatted worklogs"
    };
  }
});



const resolveJiraAccountMapping = {};

async function resolveJiraAccount(jiraSignatures,accountId) {
  //todo: storage of accountId;
  //return 
  if (resolveJiraAccountMapping[accountId]) return resolveJiraAccountMapping[accountId];
  let foundSignature = jiraSignatures.find(js => js.accountId == accountId);
  if (!foundSignature) {

    if (!resolveJiraAccountMapping[accountId]) {
      console.warn("resolveJiraAccount", "No signature found for accountId", accountId);
    }
    var retrievedJiraUser = (await api.asApp().requestJira(route`/rest/api/2/user?accountId=${accountId}`).then(r => r.json()));
    let s = { accountId, displayName: retrievedJiraUser.displayName, b64Signature: null };
    resolveJiraAccountMapping[accountId] = resolveJiraAccountMapping[accountId] || s;

    jiraSignatures.push(s);
    await storage.set('jira-user-signatures', jiraSignatures);

    return s;
  }
  else {
    resolveJiraAccountMapping[accountId] = foundSignature;
  }
  return foundSignature;
}
//const jiraUserSignatures = [];
const getJiraUserSignatures = async ({ payload, context }) => {
  
  try {
    var users = [];
    var jiraUsers = (await api.asApp().requestJira(route`/rest/api/3/users`).then(r => r.json())).filter(user => user.accountType != 'app');

    users.splice(0, 0, ...jiraUsers);



    var jiraUserSignatures = (await storage.get('jira-user-signatures')) || [];


    return users.map(user => {
      let userSignature = jiraUserSignatures.find(jus => jus.accountId == user.accountId);
      let b64Signature = userSignature ? userSignature.b64Signature : '.........';
      return { ...user, b64Signature };
    });
  }
  catch (e) {
    console.error("getJiraUserSignatures", e);
    throw e;
  }
}

ancomreportresolver.define('getJiraUserSignatures', getJiraUserSignatures);
ancomreportresolver.define('setJiraUserSignatures', async ({ payload, context }) => {
  //console.debug("setJiraUserSignatures", payload);
  if (typeof payload == "string") payload = JSON.parse(payload);



  return await storage.set('jira-user-signatures', payload);

})


const fetchIssueData = async (issueIdOrKey) => {
  //console.debug("fetchIssueData", issueIdOrKey);
  const issueData = await api.asApp().requestJira(route`./rest/api/3/issue/${issueIdOrKey}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-Atlassian-Token': 'no-check'
    }
  }).then(res => res.json()).catch(e => console.error("fetchIssueData", e));


  console.debug("fetchIssueData : got data");
  return issueData;
};

const fetchIssueWorklogs = async (issueIdOrKey) => {
  console.debug("fetchIssueWorklogs", issueIdOrKey);
  const fetchIssueWorklogs = await api.asApp().requestJira(route`./rest/api/3/issue/${issueIdOrKey}/worklog`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-Atlassian-Token': 'no-check'
    }
  }).then(res => res.json()).catch(e => console.error("fetchIssueWorklogs", e));


  console.debug("fetchIssueWorklogs : got data");
  return fetchIssueWorklogs;
};



ancomreportresolver.define('getJiraUserSignature', async function (req) {
  const jiraSignatures = await getJiraUserSignatures({ payload: null, context: req.context });
  return await resolveJiraAccount(jiraSignatures,req.payload);
});
ancomreportresolver.define('getFormattedWorklogs', getFormattedWorklogs);
ancomreportresolver.define('getFormattedWorklogsOLD', async (req) => {
  let offset = req.payload.offset || 0;
  let limit = req.payload.limit || 50;
  console.log("getFormattedWorklogs:req", req);
  console.debug("limit and offset", limit, offset);
  let context = req.context;
  try {
    if (!(context && context.extension && context.extension.issue)) return Promise.resolve("{}");
    var issueWorklogs = await fetchIssueWorklogs(req.context.extension.issue.key);
    //console.debug("issueWorklogs", JSON.stringify(issueWorklogs));
    if (!issueWorklogs || !issueWorklogs.worklogs) {
      console.error("getFormattedWorklogs:!issueWorklogs", "Failed to get issue worklogs");
      throw new Error("Failed to get issue worklogs");
    }
    var jiraWorklogIds = issueWorklogs && issueWorklogs.worklogs && issueWorklogs.worklogs.map(wl => wl.id);

    var tempoLogs = { worklogs: [] };
    var tempoKey = await getTempoKey();
    if (!tempoKey) {

      console.error("getFormattedWorklogs:!tempoKey", { message: "No key available for tempo!" });
      throw new Error("No key available for tempo!");
    }
    else {
      var jTtRequestOptions = {
        method: 'POST',
        headers: { "Authorization": `Bearer ${tempoKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ jiraWorklogIds }),
        redirect: 'follow'
      };
      var errorMessage = null;
      var jiraToTempoMapping = !!tempoKey && await api.fetch("https://api.tempo.io/4/worklogs/jira-to-tempo?limit=5000", jTtRequestOptions).then(r => r.json()).catch(e => { console.error("getFormattedWorklogs:jira-to-tempo", e); errorMessage = e; });
      //let k = "QuVLrDU3Lc72pCyqlKYGso_vxLXIPtlx5ub7lCSJEK8-eu";



      if (!jiraToTempoMapping || (jiraToTempoMapping.errors && jiraToTempoMapping.errors.length > 0)) {
        console.error("getFormattedWorklogs", jiraToTempoMapping.errors.length ? JSON.stringify(jiraToTempoMapping.errors) : "Failed to get jiraToTempoMapping");
        jiraToTempoMapping = { worklogs: [] };
        console.error("https://api.tempo.io/4/worklogs/jira-to-tempo?limit=5000", JSON.stringify(jTtRequestOptions, null, '\t'));
        //throw new Error("Failed to get jiraToTempoMapping");
      }

      var requestOptions = {
        method: 'GET',
        headers: { "Authorization": `Bearer ${tempoKey}` },
        redirect: 'follow'
      };

      var $tempoLogs = !!tempoKey && await api.fetch(`https://api.tempo.io/4/worklogs?issueId=${context.extension.issue.id}&limit=${limit}&offset=${offset}`, requestOptions).then(r => r.json()).catch(e => { console.error("fetch tempo logs by issueKey", e); errorMessage = e; });

      if (!$tempoLogs) {
        console.error("getFormattedWorklogs:!tempoLogs", "Failed to get tempo logs");
        tempoLogs = { results: [] };
      }
      else {
        tempoLogs = $tempoLogs;
      }
    }
    console.debug("getFormattedWorklogs:issue", context.extension.issue);










    tempoLogs = await Promise.all(tempoLogs.results.map(async (tempoLog) => {
      //console.debug("getting Jira Display Name", tempoLog.author.self);
      try {

        var authorResolved = await resolveJiraAccount(tempoLog.author.accountId);
        tempoLog.author.displayName = authorResolved.displayName;
        tempoLog.author.b64Signature = authorResolved.b64Signature;
        //console.debug("authorResolved", authorResolved);
      }
      catch (ee) {
        tempoLog.author.displayName = "unknown from tempo";
        console.error("Error resolving displayName", ee);
      }
      //console.debug("got Jira Display Name", tempoLog.author.displayName);
      return tempoLog;
    }));

    console.debug("TEMPO Logs found", tempoLogs.length);
    //console.debug("jiraToTempoMapping", JSON.stringify(jiraToTempoMapping,null,'\t'));



    function mapWorkLog(worklog) {
      //console.debug("worklog", worklog.id);
      try {
        var result = jiraToTempoMapping && jiraToTempoMapping.results && jiraToTempoMapping.results.find(rm => rm.jiraWorklogId == worklog.id);

        var tempoWorklogId = result && result.tempoWorklogId;
        //console.debug("mapWorkLog found tempo log ? ", JSON.stringify(result || null));
        var tempoLog = tempoWorklogId && tempoLogs.find(tempoWorklog => tempoWorklog.tempoWorklogId == tempoWorklogId);
        //console.debug("mapWorkLog found tempo log ? ", JSON.stringify(tempoLog || null));
        var started = new Date(worklog.started);
        var ended = new Date(worklog.started);
        ended.setSeconds(worklog.timeSpentSeconds);
        var summary = worklog.comment && worklog.comment.content && worklog.comment.content[0] && worklog.comment.content[0].content[0] && worklog.comment.content[0].content[0].text || worklog.comment;
        return {
          who: (tempoLog && tempoLog.author.displayName) || worklog.author.displayName,
          worker: (tempoLog && tempoLog.author.displayName) || worklog.author.displayName,
          accountId: tempoLog.author.accountId || worklog.author.accountId,
          //signature: (tempoLog && tempoLog.author.b64Signature) || null,
          from: started.toLocaleString(),
          "date": `${started.getMonth() + 1}/${started.getDate()}`,
          "time-in": started.toTimeString().replace(/(\d\d:\d\d):\d\d.*/, "$1"),
          to: ended.toLocaleString(),
          "time-out": ended.toTimeString().replace(/(\d\d:\d\d):\d\d.*/, "$1"),
          summary: tempoLog ? tempoLog.description : summary,
          timeSpentSeconds: parseFloat(worklog.timeSpentSeconds),
        }; //
      }
      catch (e) {
        console.error("mapworklog", e);
        var started = new Date(worklog.started);
        var ended = new Date(worklog.started);
        ended.setSeconds(worklog.timeSpentSeconds);
        return {
          who: worklog.author.displayName,
          worker: worklog.author.displayName,

          from: started.toLocaleString(),
          "date": `${started.getMonth() + 1}/${started.getDate()}`,
          "time-in": started.toTimeString().replace(/(\d\d:\d\d):\d\d.*/, "$1"),
          to: ended.toLocaleString(),
          "time-out": ended.toTimeString().replace(/(\d\d:\d\d):\d\d.*/, "$1"),
          summary: `${summary}`,
          timeSpentSeconds: parseFloat(worklog.timeSpentSeconds),
          error: e
        };
      }
    }
    var resolvedWorklogs = issueWorklogs && issueWorklogs.worklogs.map(mapWorkLog);
    //console.debug("resolvedWorklogs",resolvedWorklogs);
    return { worklogs: resolvedWorklogs, timeSpentSeconds: resolvedWorklogs.reduce((acc, wl) => acc + wl.timeSpentSeconds, 0) };
  }
  catch (e) {
    throw e;
    return [];
  }
});



ancomreportresolver.define('getIssueKey', async (req) => {
  return req.context.extension.issue.key;
});

export const handler = ancomreportresolver.getDefinitions();