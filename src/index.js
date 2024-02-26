import Resolver from '@forge/resolver';
import api, { route, requestJira } from "@forge/api";
import { storage } from '@forge/api';

async function getTempoKey() {

  let tempoKey = await storage.getSecret("tempo-key");
  //console.debug("getTempoKey", tempoKey);
  return tempoKey && typeof tempoKey == "string" && tempoKey || "";
}

const resolver = new Resolver();

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

resolver.define('getTempoKey', async (req) => {
  return await getTempoKey();
});

resolver.define('testTempoKey', async ({ payload }) => {
  console.debug("testTempoKey", payload);
  var requestOptions = {
    method: 'GET',
    headers: { "Authorization": `Bearer ${payload}` },
    redirect: 'follow'
  };

  try {
    let tempoTestResults = await api.fetch("https://api.tempo.io/4/globalconfiguration", requestOptions).then(r => r.json()).catch(e => console.error(e));
    //let k = "

    console.debug("tempoTestResults", tempoTestResults);
    return tempoTestResults || 'Fail...';
  }
  catch (ee) {
    console.error("Failed to test results");
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

resolver.define('getJiraUserSignatures', async ({ payload, context }) => {
  
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
})
resolver.define('setJiraUserSignatures', async ({ payload, context }) => {
  
  if (typeof payload == "string") payload = JSON.parse(payload);

  var jiraUserSignatures = (await storage.get('jira-user-signatures')) || [];

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
  }).then(res => res.json()).catch(e => console.error(e));


  console.debug("fetchIssueData : got data");
  return issueData;
};



resolver.define('getFormattedWorklogs', async ({ payload, context }) => {


  try {
    var tempoKey = await getTempoKey();
    if (!tempoKey) {

      console.error({ message: "No key available for tempo!" });
    }
    console.debug("getFormattedWorklogs", context.extension.issue);
    if (!(context && context.extension && context.extension.issue)) return Promise.resolve("{}");
    var issueData = await fetchIssueData(context.extension.issue.key).catch(e => console.error(e));
    //console.debug("IssueData", JSON.stringify(issueData));
    var jiraWorklogIds = issueData && issueData.fields.worklog.worklogs.map(wl => wl.id);

    var jTtRequestOptions = {
      method: 'POST',
      headers: { "Authorization": `Bearer ${tempoKey}` },
      body: JSON.stringify({ jiraWorklogIds }),
      redirect: 'follow'
    };
    var errorMessage = null;
    var jiraToTempoMapping = await api.fetch("https://api.tempo.io/4/worklogs/jira-to-tempo", jTtRequestOptions).then(r => r.json()).catch(e => { console.error(e); errorMessage = e; });
    //let k = "QuVLrDU3Lc72pCyqlKYGso_vxLXIPtlx5ub7lCSJEK8-eu";

    var requestOptions = {
      method: 'GET',
      headers: { "Authorization": `Bearer ${tempoKey}` },
      redirect: 'follow'
    };

    if (!jiraToTempoMapping) {
      console.error("Failed to get jiraToTempoMapping");
      jiraToTempoMapping = { results: [] };
      //return null;
      //return {message:"Failed to get jiraToTempoMapping: ",details: errorMessage};
    }


    var tempoLogs = await api.fetch(`https://api.tempo.io/4/worklogs?issueId=${context.extension.issue.id}`, requestOptions).then(r => r.json()).catch(e => { console.error(e); errorMessage = e; });

    if (!tempoLogs) {
      console.error("Failed to get tempo logs");
      tempoLogs = { results: [] };
      //return null;
      //return {message:"Failed to get Tempo logs: ",details: errorMessage};
    }



    async function resolveJiraAccount(accountId) {
      //todo: storage of accountId;
      return (await api.asApp().requestJira(route`/rest/api/2/user?accountId=${accountId}`).then(r => r.json()));
    }

    tempoLogs = await Promise.all(tempoLogs.results.map(async (tempoLog) => {
      console.debug("getting Jira Display Name", tempoLog.author.self);
      try {

        var headers = {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-Atlassian-Token': 'no-check'
          }
        }
        var authorResolved = await resolveJiraAccount(tempoLog.author.accountId);
        tempoLog.author.displayName = authorResolved.displayName;
        console.debug("authorResolved", authorResolved);
      }
      catch (ee) {
        tempoLog.author.displayName = "unknown from tempo";
        console.error("Error resolving displayName", ee);
      }
      console.debug("got Jira Display Name", tempoLog.author.displayName);
      return tempoLog;
    }));

    console.debug("TEMPO Logs found", tempoLogs.length);

    function mapWorkLog(worklog) {
      console.debug("worklog", worklog.id);
      try {
        var { tempoWorklogId } = jiraToTempoMapping.results.find(rm => rm.jiraWorklogId == worklog.id);
        var tempoLog = tempoWorklogId && tempoLogs.find(tempoWorklog => tempoWorklog.tempoWorklogId == tempoWorklogId);
        //console.debug("mapWorkLog found tempo log ? ", JSON.stringify(tempoLog || null));
        var started = new Date(worklog.started);
        var ended = new Date(worklog.started);
        ended.setSeconds(worklog.timeSpentSeconds);
        var summary = worklog.comment && worklog.comment.content && worklog.comment.content[0] && worklog.comment.content[0].content[0] && worklog.comment.content[0].content[0].text || worklog.comment;
        return {
          who: (tempoLog && tempoLog.author.displayName) || worklog.author.displayName,
          worker: (tempoLog && tempoLog.author.displayName) || worklog.author.displayName,
          from: started.toLocaleString(),
          "date": `${started.getMonth() + 1}/${started.getDate()}`,
          "time-in": started.toTimeString().replace(/(\d\d:\d\d):\d\d.*/, "$1"),
          to: ended.toLocaleString(),
          "time-out": ended.toTimeString().replace(/(\d\d:\d\d):\d\d.*/, "$1"),
          summary: tempoLog ? tempoLog.description : summary,
        };
      }
      catch (e) {
        console.error("mapworklog", e);
        return {
          who: worklog.author.displayName,
          worker: worklog.author.displayName,
          from: started.toLocaleString(),
          "date": `${started.getMonth() + 1}/${started.getDate()}`,
          "time-in": started.toTimeString().replace(/(\d\d:\d\d):\d\d.*/, "$1"),
          to: ended.toLocaleString(),
          "time-out": ended.toTimeString().replace(/(\d\d:\d\d):\d\d.*/, "$1"),
          summary: `${summary}`,
          error: e
        };
      }
    }
    var resolvedWorklogs = issueData && issueData.fields.worklog.worklogs.map(mapWorkLog);
    //console.debug("resolvedWorklogs",resolvedWorklogs);
    return JSON.stringify(resolvedWorklogs);
  }
  catch (e) {
    console.error(e);
    return [];
  }
});






export const handler = resolver.getDefinitions();


