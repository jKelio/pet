import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '../../../shared/components/ui/alert-dialog.js';
import { Input } from '../../../shared/components/ui/input.js';
import { Label } from '../../../shared/components/ui/label.js';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (fields: { playerName?: string; drillLabel?: string }) => void;
}

/**
 * Asks for the PDF header fields at export time — a Drill Run has zero setup,
 * so this is the only moment the tracked player's name is collected.
 */
export function DrillRunExportDialog({ open, onOpenChange, onExport }: Props) {
  const { t } = useTranslation('pet');
  const [playerName, setPlayerName] = useState('');
  const [drillLabel, setDrillLabel] = useState('');

  const handleExport = () => {
    onExport({
      playerName: playerName.trim() || undefined,
      drillLabel: drillLabel.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('drillTracker.exportTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('drillTracker.exportBody')}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="drill-run-player">{t('drillTracker.playerNameLabel')}</Label>
            <Input
              id="drill-run-player"
              value={playerName}
              maxLength={120}
              onChange={(e) => setPlayerName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="drill-run-label">{t('drillTracker.drillLabelLabel')}</Label>
            <Input
              id="drill-run-label"
              value={drillLabel}
              maxLength={60}
              onChange={(e) => setDrillLabel(e.target.value)}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            {t('buttons.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleExport}>
            {t('drillTracker.export')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
