import { useAuth0 } from "@auth0/auth0-react";
import { Browser } from "@capacitor/browser";
import {IonButton, IonIcon, IonItem, IonLabel, IonMenuToggle} from "@ionic/react";
import { callbackUri } from "../auth.config";
import {logOut, logOutOutline} from "ionicons/icons";
import {useTranslation} from "react-i18next";

const LogoutButton: React.FC = () => {
  const { logout } = useAuth0();
  const { t } = useTranslation('menu');

  const doLogout = async () => {
    await logout({
      async openUrl(url) {
        await Browser.open({
          url,
          windowName: "_self",
        });
      },
      logoutParams: {
        returnTo: callbackUri
      }
    });
  };

  return <IonMenuToggle autoHide={false}>
    <IonItem className="logout" button lines="none" detail={false} onClick={doLogout}>
      <IonIcon aria-hidden="true" slot="start" ios={logOutOutline} md={logOut}/>
      <IonLabel>{t('signout')}</IonLabel>
    </IonItem>
  </IonMenuToggle>;
};

export default LogoutButton;
