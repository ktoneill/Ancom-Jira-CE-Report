import Resolver from '@forge/resolver';
import api, { route, requestJira } from "@forge/api";
import { storage } from '@forge/api';

async function getTempoKey() {

  let tempoKey = await storage.getSecret("tempo-key");
  //console.debug("getTempoKey", tempoKey);
  return tempoKey && typeof tempoKey == "string" && tempoKey || "";
}

const resolver = new Resolver();

async function checkAndRenewOAuthToken() {
  let tempoAuthData = await storage.getSecret('tempo-auth-data');
  if (!tempoAuthData || !tempoAuthData.refresh_token || !tempoAuthData.expires_in || !tempoAuthData.timestamp) {
    console.error("Incomplete auth data or refresh token not available.");
    return null;
  }

  const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
  const tokenExpiryTime = tempoAuthData.timestamp + tempoAuthData.expires_in;
  if (currentTime < tokenExpiryTime) {
    console.log("Token is still valid, no need to renew.");
    return tempoAuthData; // Token is still valid, no need to renew
  }

  const urlBody = new URLSearchParams();

  let grantType = tempoAuthData.refresh_token ? "refresh_token" : "authorization_code";
  urlBody.append("grant_type", grantType);
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
      console.error("Failed to renew OAuth token", response.statusText);
      return null;
    }

    const tokenData = await response.json();
    console.debug("Renewed OAuth Token Data", JSON.stringify(tokenData));

    // Update stored auth data with new tokens and current timestamp
    const updatedAuthData = { ...tempoAuthData, ...tokenData, timestamp: Math.floor(Date.now() / 1000) };
    await storage.setSecret('tempo-auth-data', updatedAuthData);

    // Optionally update the tempo-key if it's being used elsewhere
    if (tokenData.access_token) {
      await storage.setSecret('tempo-key', tokenData.access_token);
    }

    return updatedAuthData;
  } catch (error) {
    console.error("Error renewing OAuth token", error);
    return null;
  }
}





resolver.define('getText', (req) => {
  console.debug("getText: req", req);
  console.debug("getText: issueData", req.context.extension.issue);
  return "Issue data";
});

resolver.define('getTempoAuthData', async (req) => {
  return (await storage.getSecret('tempo-auth-data')) || { "client_id": "", "client_secret": "", "grant_type": "", "redirect_uri": "", "code": "", "refresh_token": "" };
});

resolver.define('setTempoAuthData', async ({ payload }) => {
  let tempoAuthData = await storage.getSecret('tempo-auth-data');

  let grantType = payload.refresh_token ? "refresh_token" : "authorization_code";
  let urlBody = new URLSearchParams();
  urlBody.append("code", payload.code);
  urlBody.append("client_id", payload.client_id);
  urlBody.append("client_secret", payload.client_secret);
  urlBody.append("grant_type", grantType);
  urlBody.append("redirect_uri", payload.redirect_uri);

  try {

    await api.fetch("https://api.tempo.io/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: urlBody.toString(),
      redirect: 'follow'
    })
      .then(r => r.json())
      .then(async (tokenData) => {
        console.debug("tokenData", JSON.stringify(tokenData));
        let mergedPayload = { ...payload, ...tokenData };
        await storage.setSecret('tempo-auth-data', mergedPayload);
        if (payload.access_token) {
          await storage.setSecret('tempo-key', payload.access_token);
        }
      }).catch(e => {
        console.error("setTempoAuthData", e);
      });
    return await storage.getSecret('tempo-auth-data');
  }
  catch (ee) {
    console.error("setTempoAuthData", ee);
    return null;
  }








});


resolver.define('renewTempoKey', async (req) => {
  console.debug("renewTempoKey", req);
  return await checkAndRenewOAuthToken();
});

resolver.define('getTempoKey', async (req) => {
  return await getTempoKey();
});

resolver.define('testTempoKey', async ({payload}) => {
  let token = payload;
  console.debug("testTempoKey", token);
  var requestOptions = {
    method: 'GET',
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json"},
    redirect: 'follow'
  };

  try {
    let response = await api.fetch("https://api.tempo.io/4/globalconfiguration", requestOptions);
    if (response.status != 200) {
      return new Error("Failed to get tempo configuration", repsonse.statusText);
    }
    let tempoTestResults = await response.json();
    //let k = "

    console.debug("tempoTestResults", tempoTestResults);
    if (!tempoTestResults) throw "Failed to get tempo configuration";
    return tempoTestResults || 'Fail...';
  }
  catch (ee) {
    console.error("Failed to test results");
    throw "Tempo test failed: " + ee;
    return ee;
  }

});

resolver.define('setTempoKey', async ({ payload }) => {
  await storage.setSecret("tempo-key", payload);

  var requestOptions = {
    method: 'GET',
    headers: { "Authorization": `Bearer ${payload}` },
    redirect: 'follow'
  };
  return await api.fetch("https://api.tempo.io/4/globalconfiguration", requestOptions).then(r => r.json()).catch(e => console.error(e));
  //let k = "
});

resolver.define('getIssueKey', ({ payload, context }) => {
  console.debug("getIssueKey", context.extension.issue);

  return context && context.extension && context.extension.issue && context.extension.issue.key || 'no issue';

})

const getJiraUserSignatures = async ({ payload, context }) => {
  
  try {
    var users = [];
    var jiraUsers = (await api.asApp().requestJira(route`/rest/api/3/users`).then(r => r.json())).filter(user=>user.accountType != 'app');
    
    users.splice(0, 0, ...jiraUsers);
    

    
    var jiraUserSignatures = (await storage.get('jira-user-signatures')) || [];

    
    return users.map(user => {
      let userSignature = jiraUserSignatures.find(jus => jus.accountId == user.accountId);
      let b64Signature = userSignature ? userSignature.b64Signature : '.........';
      return { ...user, b64Signature };
    });
  }
  catch (e) {
    console.error("getJiraUserSignatures",e);
    return [{accountId:"fake",displayName:"error",b64Signature:JSON.stringify(e||'error')}];
  }
}

resolver.define('getJiraUserSignatures', getJiraUserSignatures);
resolver.define('setJiraUserSignatures', async ({ payload, context }) => {
  console.debug("setJiraUserSignatures", payload);
  if (typeof payload == "string") payload = JSON.parse(payload);

  

  return await storage.set('jira-user-signatures', payload);

})


const fetchIssueData = async (issueIdOrKey) => {
  console.debug("fetchIssueData", issueIdOrKey);
  const issueData = await api.asApp().requestJira(route`./rest/api/3/issue/${issueIdOrKey}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-Atlassian-Token': 'no-check'
    }
  }).then(res => res.json()).catch(e => console.error("fetchIssueData",e));


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
  }).then(res => res.json()).catch(e => console.error("fetchIssueWorklogs",e));


  console.debug("fetchIssueWorklogs : got data");
  return fetchIssueWorklogs;
};

resolver.define('getFormattedWorklogs', async ({ payload, context }) => {


  try {
    if (!(context && context.extension && context.extension.issue)) return Promise.resolve("{}");
    var issueWorklogs = await fetchIssueWorklogs(context.extension.issue.key);
    console.debug("issueWorklogs", JSON.stringify(issueWorklogs));
    if (!issueWorklogs || !issueWorklogs.worklogs) {
      console.error("getFormattedWorklogs:!issueWorklogs", "Failed to get issue worklogs");
      return new Error("Failed to get issue worklogs");
    }
    var jiraWorklogIds = issueWorklogs && issueWorklogs.worklogs && issueWorklogs.worklogs.map(wl => wl.id);
    
    var tempoLogs = { results: [] };
    var tempoKey = await getTempoKey();
    if (!tempoKey) {

      console.error("getFormattedWorklogs:!tempoKey",{ message: "No key available for tempo!" });
    }
    else {
      var jTtRequestOptions = {
        method: 'POST',
        headers: { "Authorization": `Bearer ${tempoKey}` },
        body: JSON.stringify({ jiraWorklogIds }),
        redirect: 'follow'
      };
      var errorMessage = null;
      var jiraToTempoMapping = !!tempoKey && await api.fetch("https://api.tempo.io/4/worklogs/jira-to-tempo?limit=5000", jTtRequestOptions).then(r => r.json()).catch(e => { console.error("getFormattedWorklogs:jira-to-tempo",e); errorMessage = e; });
      //let k = "QuVLrDU3Lc72pCyqlKYGso_vxLXIPtlx5ub7lCSJEK8-eu";
  
      var requestOptions = {
        method: 'GET',
        headers: { "Authorization": `Bearer ${tempoKey}` },
        redirect: 'follow'
      };
  
      if (!jiraToTempoMapping) {
        console.error("getFormattedWorklogs","Failed to get jiraToTempoMapping");
        jiraToTempoMapping = { results: [] };
        //return null;
        //return {message:"Failed to get jiraToTempoMapping: ",details: errorMessage};
      }
  
  
      var $tempoLogs = !!tempoKey && await api.fetch(`https://api.tempo.io/4/worklogs?issueId=${context.extension.issue.id}&limit=5000`, requestOptions).then(r => r.json()).catch(e => { console.error("fetch tempo logs by issueKey",e); errorMessage = e; });
  
      if (!$tempoLogs) {
        console.error("getFormattedWorklogs:!tempoLogs", "Failed to get tempo logs");
        tempoLogs = { results: [] };
        //return null;
        //return {message:"Failed to get Tempo logs: ",details: errorMessage};
      }
      else {
        tempoLogs = $tempoLogs;
      }
    }
    console.debug("getFormattedWorklogs", context.extension.issue);
    

    


    const jiraSignatures = await getJiraUserSignatures({ payload: null, context });


    async function resolveJiraAccount(accountId) {
      //todo: storage of accountId;
      //return 
      let foundSignature = jiraSignatures.find(js => js.accountId == accountId);
      if (!foundSignature) {
        console.error("resolveJiraAccount", "No signature found for accountId", accountId);
        var retrievedJiraUser = (await api.asApp().requestJira(route`/rest/api/2/user?accountId=${accountId}`).then(r => r.json()));
        jiraSignatures.push({ accountId, displayName: retrievedJiraUser.displayName, b64Signature: null });
        await storage.set('jira-user-signatures', jiraSignatures);

        return { accountId, displayName: retrievedJiraUser.displayName, b64Signature: null };
      }
      return foundSignature;
    }

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

    function mapWorkLog(worklog) {
      //console.debug("worklog", worklog.id);
      try {
        var result  = jiraToTempoMapping.results.find(rm => rm.jiraWorklogId == worklog.id);
      
        var tempoWorklogId = result && result.tempoWorklogId;
        var tempoLog = tempoWorklogId && tempoLogs.find(tempoWorklog => tempoWorklog.tempoWorklogId == tempoWorklogId);
        //console.debug("mapWorkLog found tempo log ? ", JSON.stringify(tempoLog || null));
        var started = new Date(worklog.started);
        var ended = new Date(worklog.started);
        ended.setSeconds(worklog.timeSpentSeconds);
        var summary = worklog.comment && worklog.comment.content && worklog.comment.content[0] && worklog.comment.content[0].content[0] && worklog.comment.content[0].content[0].text || worklog.comment;
        return {
          who: (tempoLog && tempoLog.author.displayName) || worklog.author.displayName,
          worker: (tempoLog && tempoLog.author.displayName) || worklog.author.displayName,
          signature: (tempoLog && tempoLog.author.b64Signature) || null,
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
    return {worklogs:resolvedWorklogs, timeSpentSeconds: resolvedWorklogs.reduce((acc, wl) => acc + wl.timeSpentSeconds, 0)};
  }
  catch (e) {
    throw e;
    return [];
  }
});






export const handler = resolver.getDefinitions();


