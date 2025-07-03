import { IonApp, IonRouterOutlet, IonSplitPane, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Redirect, Route } from 'react-router-dom';
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";
import Menu from './components/Menu';
import Page from './pages/Page';
import {callbackUri} from "./auth.config";
import TrackingContextProvider from "./pages/tracking/TrackingContextProvider";

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

/* Theme variables */
import './theme/variables.css';
import Language from "./pages/language/Language";
import Feedback from "./pages/feedback/Feedback";
import Tracking from "./pages/tracking/tracking";
import TimeWatcher from "./pages/tracking/TimeWatcher";
import Results from "./pages/tracking/Results";

setupIonicReact();

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
      <IonReactRouter>
        <IonSplitPane contentId="main">
          <Menu />
          <IonRouterOutlet id="main">
            <Route path="/" exact={true}>
              <Redirect to="/page/language" />
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
          </IonRouterOutlet>
        </IonSplitPane>
      </IonReactRouter>
    </IonApp>
  );
};

const App: React.FC = () => {
  return (
    <TrackingContextProvider>
      <AppContent />
    </TrackingContextProvider>
  );
};

export default App;
