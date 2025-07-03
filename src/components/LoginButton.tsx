import { useAuth0 } from "@auth0/auth0-react";
import { Browser } from "@capacitor/browser";
import {IonIcon, IonItem, IonLabel, IonMenuToggle} from "@ionic/react";
import {logInOutline, logInSharp} from "ionicons/icons";
import {useTranslation} from "react-i18next";

const LoginButton: React.FC = () => {
  const { loginWithRedirect } = useAuth0();
  const { t } = useTranslation('menu');

  const login = async () => {
    await loginWithRedirect({
      async openUrl(url) {
        await Browser.open({
          url,
          windowName: "_self"
        });
      }
    });
  };

  return <IonMenuToggle autoHide={false}>
    <IonItem className="logout" button lines="none" detail={false} onClick={login}>
      <IonIcon aria-hidden="true" slot="start" ios={logInOutline} md={logInSharp}/>
      <IonLabel>{t('signin')}</IonLabel>
    </IonItem>
  </IonMenuToggle>;
};

export default LoginButton;
