import React, { useEffect, useState } from 'react';
import { view } from '@forge/bridge';
import ConfigPage from './config-page';
import ReportPage from './report-page';
import Button from '@atlaskit/button';

function App() {
  const [context, setContext] = useState(null);

  const fetchContext = () => {
    view.getContext().then(setContext);
  };

  useEffect(() => {
    fetchContext();
  }, []);

  const renderContent = () => {
    switch (context && context.moduleKey) {
      case 'ancom-jira-ce-report-admin-page':
        return <ConfigPage />;
      case 'ancom-jira-ce-report-issue-action':
        return <ReportPage />;
      default:
        return <div>Unknown context</div>;
    }
  };

  return (
    <div>
      {renderContent()}
    </div>
  );
}

export default App;
