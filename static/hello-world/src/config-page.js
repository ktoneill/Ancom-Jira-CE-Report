import React, { useEffect, useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { invoke } from '@forge/bridge';

const ConfigPage = () => {
    const [tempoKey, setTempoKey] = useState(null);
    const [tempoAuthData, setTempoAuthData] = useState(null);
    const [tempoKeyTestResults, setTempoKeyTestResults] = useState(null);
    const [jiraUserSignatures, setJiraUserSignatures] = useState(null);
    const [globalError, setGlobalError] = useState(null);
    const [currentJiraUser,setCurrentJiraUser] = useState(null);
    const signpadRef = useRef(null);

    useEffect(() => {
        invoke('getTempoKey').then(setTempoKey).catch(setGlobalError);
    }, []);

    useEffect(() => {
        invoke('getTempoAuthData').then(setTempoAuthData).catch(setGlobalError);
    }, []);

    useEffect(() => {
        invoke('getJiraUserSignatures').then(setJiraUserSignatures).catch(setGlobalError);
    }, []);


    const saveJiraUserSignatures = () => {
        const payload = [...document.getElementById('jira-user-signatures').querySelectorAll('input')].map(b64SignInput => {
            const accountId = b64SignInput.getAttribute('data-account-id');
            const b64Signature = b64SignInput.value;
            return { accountId, b64Signature };
        });
    };

    const storeTempoKey = () => {
        invoke("setTempoKey", document.getElementById('tempo-key-input').value);
    };

    const testTempoKey = () => {
        invoke("testTempoKey", document.getElementById('tempo-key-input').value).then(td => {
            console.debug("test results", td);
            setTempoKeyTestResults(td);
        }).catch(e => console.error(e));
    };


    const handleCurrentJiraUserSignatureAccept = ()=> {
        if (signpadRef.current){
            let base64_png_signature = signpadRef.current.getTrimmedCanvas().toDataURL('image/png');
            currentJiraUser.b64Signature = base64_png_signature;
            invoke('setJiraUserSignatures', jiraUserSignatures).catch(setGlobalError);
            setCurrentJiraUser(null);
            signpadRef.current.clear();
        }
        else {
            setGlobalError("Signpad not defined");
        }
    }

    const handleSetCurrentJiraUser = (userItem)=>{
        setCurrentJiraUser(userItem);
        if (userItem.b64Signature && signpadRef.current){
            signpadRef.current.fromDataURL(userItem.b64Signature);
        }
    }

    const handleTempoAuthDataSubmit = () => {
        console.debug("handleTempoAuthDataSubmit");
        const clientId = document.querySelector('input[name="client_id"]').value;
        const code = document.querySelector('input[name="code"]').value;
        const grantType = document.querySelector('input[name="grant_type"]').value;
        const clientSecret = document.querySelector('input[name="client_secret"]').value;
        const accessToken = document.querySelector('input[name="access_token"]').value;
        const redirectUri = document.querySelector('input[name="redirect_uri"]').value;
        const refreshToken = document.querySelector('input[name="refresh_token"]').value;
        const tokenType = document.querySelector('input[name="token_type"]').value;
        const expiresIn = document.querySelector('input[name="expires_in"]').value;

        const payload = {
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
        };
        console.debug("handleTempoAuthDataSubmit payload", payload);

        invoke('setTempoAuthData', payload)
            .then(response => console.log('Tempo Auth Data set successfully', response))
            .catch(error => {
                console.error('Error setting Tempo Auth Data', error);
                setGlobalError(error);
            });
    };

    return (
        <div>Config Page!
            <ul>
                <li><h3>Tempo Auth Data</h3>
                {tempoAuthData && (
                    <div>
                        <legend>Update Tempo Authentication Data</legend>
                        <label>Client ID: <input name="client_id" defaultValue={tempoAuthData.client_id} type="text" /></label><br />
                        <label>Code: <input name="code" defaultValue={tempoAuthData.code} type="text" /></label><br />
                        <label>Grant Type: <input name="grant_type" defaultValue={tempoAuthData.grant_type} type="text" /></label><br />
                        <label>Client Secret: <input name="client_secret" defaultValue={tempoAuthData.client_secret} type="text" /></label><br />
                        <label>Access Token: <input name="access_token" defaultValue={tempoAuthData.access_token} type="text" /></label><br />
                        <label>Redirect URI: <input name="redirect_uri" defaultValue={tempoAuthData.redirect_uri} type="text" /></label><br />
                        <label>Refresh Token: <input name="refresh_token" defaultValue={tempoAuthData.refresh_token} type="text" /></label><br />
                        <label>Token Type: <input name="token_type" defaultValue={tempoAuthData.token_type} type="text" /></label><br />
                        <label>Expires In: <input name="expires_in" defaultValue={tempoAuthData.expires_in} type="text" /></label><br />
                        <button onClick={handleTempoAuthDataSubmit}>Save Tempo Data</button>
                    </div>
                )}
            </li>
                <li><h3>Errors</h3>
                    {globalError && (
                        <div>
                            <h1 style={{ color: "red" }}>Error</h1>
                            <pre>{JSON.stringify(globalError, null, '\t')}</pre>
                        </div>
                    )}
                </li>
                <li><h3>Jira User Signatures</h3>
                    {jiraUserSignatures && (
                        <div>
                            <fieldset id="jira-user-signatures">
                                <ul>
                                    {jiraUserSignatures && jiraUserSignatures.map(item => (
                                        <li key={item.accountId}>
                                            <label><a onClick={() => handleSetCurrentJiraUser(item)}> {item.displayName}</a><input name="signature" data-account-id={item.accountId} defaultValue={item.b64signature} type="text" /></label><br />
                                        </li>
                                    ))}
                                </ul>
                                <button onClick={saveJiraUserSignatures}>Save Signatures</button>
                            </fieldset>
                        </div>
                    )}
                    
                    <div style={{display:currentJiraUser ? 'initial':"none"}}>
                    <div style={{ borderColor: "black", borderStyle: "solid", borderWidth: "2px;", backgroundColor: "gray", padding: "2em" }}>
                    <SignatureCanvas penColor='black' backgroundColor='white' canvasProps={{  width: 600, height: 200, className: 'sigCanvas' }} ref={signpadRef} />
                    {currentJiraUser && (<button onClick={handleCurrentJiraUserSignatureAccept}>Update Signature {currentJiraUser.displayName}</button>)}
                    </div>
                    </div>
                    
                </li>
                <li><h3>Tempo Key</h3>
                    <label>Tempo Key: {tempoKey ? tempoKey : 'No Key Yet'} <input id="tempo-key-input" defaultValue={tempoKey} type="text" /></label><br />
                    <button onClick={storeTempoKey}>Save</button>
                    <button onClick={testTempoKey}>Test</button>

                    <pre>{tempoKeyTestResults ? JSON.stringify(tempoKeyTestResults, null, '\t') : 'Not tested'}</pre>
                </li>
            </ul>
        </div>
    );
};

export default ConfigPage;
