import React from "react";
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent, IonList, IonItem, IonLabel } from "@ionic/react";
import { useTranslation } from "react-i18next";

const glossaryKeys = [
  "wasteTime",
  "station",
  "drill",
  "technique",
  "tactic",
  "smallAreaGame",
  "teamPlay",
  "specialTeams",
  "explanation",
  "demonstration",
  "feedback",
  "changeSide",
  "timeMoving",
  "repetition"
];

const Glossary: React.FC = () => {
  const { t } = useTranslation("glossary");

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('title', { defaultValue: 'Glossary' })}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonCard style={{ marginTop: 24 }}>
          <IonCardContent>
            <IonList lines="none">
              {glossaryKeys.map((key) => {
                const title = t(`${key}.title`);
                const desc = t(`${key}.desc`);
                const includes = t(`${key}.includes`, { defaultValue: '' });
                const list = t(`${key}.list`, { returnObjects: true });
                return (
                  <IonItem key={key}>
                    <IonLabel>
                      <h2>{title}</h2>
                      <p>{desc}</p>
                      {includes && includes !== `${key}.includes` && <p style={{marginBottom:0}}>{includes}</p>}
                      {Array.isArray(list) && list.length > 0 && (
                        <ul style={{marginTop:0}}>
                          {list.map((item: string, idx: number) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </IonLabel>
                  </IonItem>
                );
              })}
            </IonList>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default Glossary; 