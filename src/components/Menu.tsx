import {
    IonContent,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonMenu,
    IonMenuToggle,
    IonNote,
} from '@ionic/react';

import {useLocation} from 'react-router-dom';
import {
    chatboxEllipsesOutline,
    chatboxEllipses,
    helpCircleOutline,
    helpCircle,
    bookOutline,
    book, stopwatchOutline, stopwatch, languageOutline, languageSharp
} from 'ionicons/icons';
import './Menu.css';
import LoginButton from "./LoginButton";
import LogoutButton from "./LogoutButton";
import {useAuth0} from "@auth0/auth0-react";
import {useTranslation} from "react-i18next";

interface AppPage {
    url: string;
    iosIcon: string;
    mdIcon: string;
    title: string;
    secured: boolean;
}

const Menu: React.FC = () => {
    const location = useLocation();
    const {isAuthenticated, user} = useAuth0();
    const {t} = useTranslation('menu');

    const appPages: AppPage[] = [
        {
            title: t('tracking'),
            url: '/page/tracking',
            iosIcon: stopwatchOutline,
            mdIcon: stopwatch,
            secured: true
        },
        {
            title: t('language'),
            url: '/page/language',
            iosIcon: languageOutline,
            mdIcon: languageSharp,
            secured: false
        },
        {
            title: t('glossary'),
            url: '/page/glossary',
            iosIcon: bookOutline,
            mdIcon: book,
            secured: true
        },
        {
            title: t('feedback'),
            url: '/page/feedback',
            iosIcon: chatboxEllipsesOutline,
            mdIcon: chatboxEllipses,
            secured: true
        }
    ];

    return (
        <IonMenu contentId="main" type="overlay">
            <IonContent>
                <IonList id="inbox-list">
                    <IonListHeader>{t('welcome')}</IonListHeader>
                    {isAuthenticated ? <IonNote>{user?.name}</IonNote> : <LoginButton/>}
                    {appPages.filter(p => isAuthenticated ? true : !p.secured).map((appPage, index) => {
                        return (
                            <IonMenuToggle key={index} autoHide={false}>
                                <IonItem className={location.pathname === appPage.url ? 'selected' : ''}
                                         routerLink={appPage.url} routerDirection="none" lines="none" detail={false}>
                                    <IonIcon aria-hidden="true" slot="start" ios={appPage.iosIcon} md={appPage.mdIcon}/>
                                    <IonLabel>{appPage.title}</IonLabel>
                                </IonItem>
                            </IonMenuToggle>
                        );
                    })}
                    {isAuthenticated ? <LogoutButton/> : null}
                </IonList>
            </IonContent>
        </IonMenu>
    );
};

export default Menu;
