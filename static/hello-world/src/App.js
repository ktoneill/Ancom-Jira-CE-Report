import React, { useEffect, useState } from 'react';
import { view } from '@forge/bridge';
import ConfigPage from './config-page';
import ReportPage from './report-page';

function App() {
  const [context, setContext] = useState(null);

  useEffect(() => {
    // Use the "view" from Forge Bridge to get the context
    // where this React app is running
    view.getContext()
      .then(setContext);
  }, []);

  switch (context && context.moduleKey) {
    case 'ancom-jira-ce-report-admin-page':
      // Render "ConfigPage" if we are in module "admin-page"
      return <div><h3>{context.moduleKey}</h3>
        <ConfigPage></ConfigPage>
        </div>;
    case 'ancom-jira-ce-report-issue-action':
      // Render "ReportPage" if we are in module "issue-panel"
      return <ReportPage />;
    default:
      // Render a default or error state if context is not recognized
      return <div>Unknown context</div>;
  }
}

export default App;
