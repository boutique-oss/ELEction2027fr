import App from './App';
import { chargerSondages, resume } from '@/lib/sondages';
import { FICHES, MAJ } from '@/lib/contenu';

// Page régénérée au plus toutes les 15 minutes ; le reste se charge à la demande
export const revalidate = 900;

export default async function Page() {
  let sondages = null;
  try {
    sondages = resume(await chargerSondages());
  } catch {
    sondages = null;
  }
  return <App sondagesInitiaux={sondages} fiches={FICHES} redige={MAJ} />;
}
