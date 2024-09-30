import React, { useEffect, useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { invoke } from '@forge/bridge';
import { CSSTransition } from 'react-transition-group';

const ConfigPage = () => {
    const [tempoKey, setTempoKey] = useState(null);
    const [tempoAuthData, setTempoAuthData] = useState(null);
    const [tempoKeyTestResults, setTempoKeyTestResults] = useState(null);
    const [jiraUserSignatures, setJiraUserSignatures] = useState(null);
    const [globalError, setGlobalError] = useState(null);
    const [currentJiraUser, setCurrentJiraUser] = useState(null);
    const signpadRef = useRef(null);
    const [sectionsOpen, setSectionsOpen] = useState({
        tempoAuth: true,
        errorLog: true,
        jiraSignatures: true,
        tempoKey: true
    });

    useEffect(() => {
        invoke('getTempoKey').then(setTempoKey).catch(setGlobalError);
        invoke('getTempoAuthData').then(setTempoAuthData).catch(setGlobalError);
        invoke('getJiraUserSignatures').then(setJiraUserSignatures).catch(setGlobalError);
    }, []);

    const saveJiraUserSignatures = () => {
        const payload = [...document.getElementById('jira-user-signatures').querySelectorAll('textarea')].map(b64SignInput => {
            const accountId = b64SignInput.getAttribute('data-account-id');
            const b64Signature = b64SignInput.value;
            return { accountId, b64Signature };
        });
        invoke('setJiraUserSignatures', payload).catch(setGlobalError);
    };

    const storeTempoKey = () => {
        invoke("setTempoKey", document.getElementById('tempo-key-input').value);
    };

    const testTempoKey = () => {
        invoke("testTempoKey", document.getElementById('tempo-key-input').value)
            .then(setTempoKeyTestResults)
            .catch(e => setTempoKeyTestResults("Tempo Test failed: " + e.message));
    };

    const renewTempoKey = () => {
        invoke("renewTempoKey", document.getElementById('tempo-key-input').value)
            .then(setTempoKeyTestResults)
            .catch(e => setTempoKeyTestResults("Failed to renew: " + e.message));
    };

    const handleCurrentJiraUserSignatureAccept = () => {
        if (signpadRef.current) {
            let base64_png_signature = signpadRef.current.getTrimmedCanvas().toDataURL('image/png');
            setJiraUserSignatures(prevSignatures => 
                prevSignatures.map(user => 
                    user.accountId === currentJiraUser.accountId 
                        ? {...user, b64Signature: base64_png_signature}
                        : user
                )
            );
            invoke('setJiraUserSignatures', jiraUserSignatures).catch(setGlobalError);
            signpadRef.current.clear();
            setCurrentJiraUser(null);
        } else {
            setGlobalError("Signpad not defined");
        }
    }

    const handleSetCurrentJiraUser = (userItem) => {
        setCurrentJiraUser(userItem);
        if (userItem.b64Signature && signpadRef.current) {
            signpadRef.current.fromDataURL(userItem.b64Signature);
        }
    }

    const handleTempoAuthDataSubmit = () => {
        const payload = {
            code: document.querySelector('input[name="code"]').value,
            client_id: document.querySelector('input[name="client_id"]').value,
            client_secret: document.querySelector('input[name="client_secret"]').value,
            redirect_uri: document.querySelector('input[name="redirect_uri"]').value,
        };

        invoke('setTempoAuthData', payload)
            .then(response => {
                console.log('Tempo Auth Data set successfully', response);
                invoke('getTempoAuthData').then(setTempoAuthData).catch(setGlobalError);
            })
            .catch(error => {
                console.error('Error setting Tempo Auth Data', error);
                setGlobalError(error);
            });
    };

    const toggleSection = (section) => {
        setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }));
    };

    return (
        <div style={{
            fontFamily: "'Roboto', Arial, sans-serif",
            maxWidth: '600px',
            margin: '0 auto',
            padding: '20px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
        }}>
            <h1 style={{
                color: '#2c3e50',
                borderBottom: '3px solid #3498db',
                paddingBottom: '15px',
                marginBottom: '20px',
                fontWeight: 700
            }}>ANCOM CE Report Configuration</h1>
            
            <ul style={{listStyle: 'none', padding: 0}}>
                <li style={{
                    marginBottom: '20px',
                    backgroundColor: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '10px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.3s ease'
                }}>
                    <h2 style={{
                        color: '#34495e',
                        marginBottom: '10px',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }} onClick={() => toggleSection('tempoAuth')}>
                        Tempo Authentication {sectionsOpen.tempoAuth ? '▼' : '▶'}
                    </h2>
                    <CSSTransition in={sectionsOpen.tempoAuth && !!tempoAuthData} timeout={300} classNames="fade" unmountOnExit>
                        <div>
                            <legend>Update Tempo Authentication Data</legend>
                            {Object.entries(tempoAuthData || {}).map(([key, value]) => (
                                <div key={key} style={{marginBottom: '10px'}}>
                                    <label htmlFor={key} style={{display: 'block', marginBottom: '5px'}}>{key}</label>
                                    <input 
                                        id={key}
                                        name={key} 
                                        defaultValue={value} 
                                        type="text" 
                                        placeholder={key}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            border: '2px solid #ddd',
                                            borderRadius: '4px',
                                            fontSize: '14px',
                                            transition: 'border-color 0.3s ease'
                                        }}
                                    />
                                </div>
                            ))}
                            <button 
                                onClick={handleTempoAuthDataSubmit}
                                style={{
                                    backgroundColor: '#3498db',
                                    color: 'white',
                                    padding: '8px 15px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.3s, transform 0.2s',
                                    fontSize: '14px',
                                    fontWeight: 600
                                }}
                            >Save Tempo Data</button>
                        </div>
                    </CSSTransition>
                </li>

                <li style={{
                    marginBottom: '20px',
                    backgroundColor: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '10px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.3s ease'
                }}>
                    <h2 style={{
                        color: '#34495e',
                        marginBottom: '10px',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }} onClick={() => toggleSection('errorLog')}>
                        Error Log {sectionsOpen.errorLog ? '▼' : '▶'}
                    </h2>
                    <CSSTransition in={sectionsOpen.errorLog && !!globalError} timeout={300} classNames="fade" unmountOnExit>
                        <div style={{
                            color: '#e74c3c',
                            backgroundColor: '#fadbd8',
                            padding: '10px',
                            borderRadius: '4px',
                            marginTop: '10px',
                            fontWeight: 500
                        }}>
                            <h4>Error Detected</h4>
                            <pre style={{fontSize: '12px'}}>{JSON.stringify(globalError, null, 2)}</pre>
                        </div>
                    </CSSTransition>
                </li>

                <li style={{
                    marginBottom: '20px',
                    backgroundColor: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '10px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.3s ease'
                }}>
                    <h2 style={{
                        color: '#34495e',
                        marginBottom: '10px',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }} onClick={() => toggleSection('jiraSignatures')}>
                        Jira User Signatures {sectionsOpen.jiraSignatures ? '▼' : '▶'}
                    </h2>
                    <CSSTransition in={sectionsOpen.jiraSignatures && !!jiraUserSignatures} timeout={300} classNames="fade" unmountOnExit>
                        <div>
                            <fieldset id="jira-user-signatures">
                                <ul style={{listStyle: 'none', padding: 0}}>
                                    {jiraUserSignatures && jiraUserSignatures.map(item => (
                                        <li key={item.accountId} style={{marginBottom: '10px'}}>
                                            <button 
                                                onClick={() => handleSetCurrentJiraUser(item)} 
                                                style={{
                                                    marginRight: '10px',
                                                    backgroundColor: '#3498db',
                                                    color: 'white',
                                                    padding: '8px 15px',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    transition: 'background-color 0.3s, transform 0.2s',
                                                    fontSize: '14px',
                                                    fontWeight: 600
                                                }}
                                            >{item.displayName}</button>
                                            <textarea 
                                                name="signature" 
                                                data-account-id={item.accountId} 
                                                defaultValue={item.b64Signature}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px',
                                                    borderRadius: '4px',
                                                    border: '2px solid #ddd',
                                                    resize: 'vertical',
                                                    fontSize: '12px'
                                                }}
                                            />
                                        </li>
                                    ))}
                                </ul>
                                <button 
                                    onClick={saveJiraUserSignatures}
                                    style={{
                                        backgroundColor: '#3498db',
                                        color: 'white',
                                        padding: '8px 15px',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.3s, transform 0.2s',
                                        fontSize: '14px',
                                        fontWeight: 600
                                    }}
                                >Save All Signatures</button>
                            </fieldset>
                        </div>
                    </CSSTransition>
                    
                    <CSSTransition in={!!currentJiraUser} timeout={300} classNames="fade" unmountOnExit>
                        <div style={{
                            border: '2px solid #bdc3c7',
                            backgroundColor: '#ecf0f1',
                            padding: '15px',
                            marginTop: '15px',
                            borderRadius: '8px'
                        }}>
                            <SignatureCanvas 
                                penColor='#2c3e50' 
                                backgroundColor='#ffffff' 
                                canvasProps={{width: 400, height: 150, className: 'sigCanvas'}} 
                                ref={signpadRef} 
                            />
                            {currentJiraUser && (
                                <button 
                                    onClick={handleCurrentJiraUserSignatureAccept} 
                                    style={{
                                        marginTop: '10px',
                                        backgroundColor: '#3498db',
                                        color: 'white',
                                        padding: '8px 15px',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.3s, transform 0.2s',
                                        fontSize: '14px',
                                        fontWeight: 600
                                    }}
                                >
                                    Update Signature for {currentJiraUser.displayName}
                                </button>
                            )}
                        </div>
                    </CSSTransition>
                </li>

                <li style={{
                    marginBottom: '20px',
                    backgroundColor: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '10px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.3s ease'
                }}>
                    <h2 style={{
                        color: '#34495e',
                        marginBottom: '10px',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }} onClick={() => toggleSection('tempoKey')}>
                        Tempo Key Management {sectionsOpen.tempoKey ? '▼' : '▶'}
                    </h2>
                    <CSSTransition in={sectionsOpen.tempoKey} timeout={300} classNames="fade" unmountOnExit>
                        <div>
                            <label htmlFor="tempo-key-input" style={{display: 'block', marginBottom: '5px'}}>Tempo Key</label>
                            <input 
                                id="tempo-key-input" 
                                defaultValue={tempoKey} 
                                type="text" 
                                placeholder="Enter Tempo Key"
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    marginBottom: '10px',
                                    border: '2px solid #ddd',
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    transition: 'border-color 0.3s ease'
                                }}
                            />
                            <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                <button 
                                    onClick={storeTempoKey}
                                    style={{
                                        backgroundColor: '#3498db',
                                        color: 'white',
                                        padding: '8px 15px',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.3s, transform 0.2s',
                                        fontSize: '14px',
                                        fontWeight: 600
                                    }}
                                >Save Key</button>
                                <button 
                                    onClick={testTempoKey}
                                    style={{
                                        backgroundColor: '#3498db',
                                        color: 'white',
                                        padding: '8px 15px',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.3s, transform 0.2s',
                                        fontSize: '14px',
                                        fontWeight: 600
                                    }}
                                >Test Key</button>
                                <button 
                                    onClick={renewTempoKey}
                                    style={{
                                        backgroundColor: '#3498db',
                                        color: 'white',
                                        padding: '8px 15px',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.3s, transform 0.2s',
                                        fontSize: '14px',
                                        fontWeight: 600
                                    }}
                                >Renew Key</button>
                            </div>

                            <CSSTransition in={!!tempoKeyTestResults} timeout={300} classNames="fade" unmountOnExit>
                                <pre style={{
                                    marginTop: '15px',
                                    padding: '10px',
                                    backgroundColor: '#f1f8ff',
                                    borderRadius: '4px',
                                    border: '1px solid #a8d2ff',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    fontSize: '12px'
                                }}>
                                    {JSON.stringify(tempoKeyTestResults, null, 2)}
                                </pre>
                            </CSSTransition>
                        </div>
                    </CSSTransition>
                </li>
            </ul>
        </div>
    );
};

export default ConfigPage;
