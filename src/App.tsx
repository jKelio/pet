import { IonApp, IonRouterOutlet, IonSplitPane, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Redirect, Route } from 'react-router-dom';
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";
import Menu from './components/Menu';
import {callbackUri} from "./auth.config";
import TrackingContextProvider from "./pages/tracking/TrackingContextProvider";
import TimerContextProvider from "./pages/tracking/TimerContextProvider";

import Language from "./pages/language/Language";
import Feedback from "./pages/feedback/Feedback";
import Tracking from "./pages/tracking/tracking";
import TimeWatcher from "./pages/tracking/TimeWatcher";
import Results from "./pages/tracking/Results";
import Glossary from "./pages/language/Glossary";

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * Custom theme defined in ./theme/variables.css
 * Uses #05173D as primary background color
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
/* import '@ionic/react/css/palettes/dark.system.css'; */

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

// Redirect based on auth status
const AuthRedirect: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return null; // Or a loading spinner
  }

  return <Redirect to={isAuthenticated ? "/page/tracking" : "/page/language"} />;
};

const AppContent: React.FC = () => {
  const { handleRedirectCallback } = useAuth0();

  useEffect(() => {
    CapApp.addListener("appUrlOpen", async ({ url }) => {
      if (url.startsWith(callbackUri)) {
        if (
            url.includes("state") &&
            (url.includes("code") || url.includes("error"))
        ) {
          await handleRedirectCallback(url);
        }

        await Browser.close();
      }
    });
  }, [handleRedirectCallback]);

  return (
    <IonApp>
      <IonReactRouter basename={import.meta.env.BASE_URL}>
        <IonSplitPane contentId="main">
          <Menu />
          <IonRouterOutlet id="main">
            <Route path="/" exact={true}>
              <AuthRedirect />
            </Route>
            <Route path="/page/language" exact={true}>
              <Language />
            </Route>
            <Route path="/page/tracking" exact={true}>
              <Tracking />
            </Route>
            <Route path="/page/timeWatcher" exact={true}>
              <TimeWatcher />
            </Route>
            <Route path="/page/results" exact={true}>
              <Results />
            </Route>
            <Route path="/page/feedback" exact={true}>
              <Feedback />
            </Route>
            <Route path="/page/glossary" exact={true}>
              <Glossary />
            </Route>
          </IonRouterOutlet>
        </IonSplitPane>
      </IonReactRouter>
    </IonApp>
  );
};

const App: React.FC = () => {
  return (
    <TrackingContextProvider>
      <TimerContextProvider>
        <AppContent />
      </TimerContextProvider>
    </TrackingContextProvider>
  );
};

export default App;
