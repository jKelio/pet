import {IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar} from '@ionic/react';
import {useParams} from 'react-router';
import ExploreContainer from '../components/ExploreContainer';
import './Page.css';
import LoginButton from "../components/LoginButton";
import LogoutButton from "../components/LogoutButton";
import {useAuth0} from "@auth0/auth0-react";

const Page: React.FC = () => {

    const { name } = useParams<{ name: string; }>();
    const { isAuthenticated } = useAuth0();

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonMenuButton/>
                    </IonButtons>
                    <IonTitle>{name}</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent fullscreen>
                <IonHeader collapse="condense">
                    <IonToolbar>
                        <IonTitle size="large">{name}</IonTitle>
                    </IonToolbar>
                </IonHeader>
                {isAuthenticated ? <LogoutButton /> : <LoginButton/>}
                <ExploreContainer name={name}/>
            </IonContent>
        </IonPage>
    );
};

export default Page;
