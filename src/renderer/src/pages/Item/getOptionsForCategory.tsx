import { AUDIO_VIDEO_TYPE, CATEGORY, COMPUTER_SCIENCE_TYPE, SMARTPHONES_TYPE } from './schema';

// I value sono i codici numerici reali dei dropdown react-select di Subito.
// Per le categorie nuove il puppeteer mappa il valore → etichetta (TYPE_LABELS) e clicca per testo.
const getOptionsForCategory = (category: CATEGORY) => {
  switch (category) {
    case CATEGORY.COMPUTER_SCIENCE:
      return (
        <>
          <option value={COMPUTER_SCIENCE_TYPE.NOTEBOOK}>NoteBook & Tablet</option>
          <option value={COMPUTER_SCIENCE_TYPE.DESKTOP}>Computer Fissi</option>
          <option value={COMPUTER_SCIENCE_TYPE.ACCESSORIES}>Accessori</option>
        </>
      );
    case CATEGORY.AUDIO_VIDEO:
      return (
        <>
          <option value={AUDIO_VIDEO_TYPE.TV}>TV</option>
          <option value={AUDIO_VIDEO_TYPE.DVD_PLAYERS}>Lettori DVD</option>
          <option value={AUDIO_VIDEO_TYPE.RADIO_STEREO}>Radio/Stereo</option>
          <option value={AUDIO_VIDEO_TYPE.MP3_PLAYERS}>Lettori MP3</option>
          <option value={AUDIO_VIDEO_TYPE.MISC}>Altro</option>
        </>
      );
    case CATEGORY.SMARTPHONES:
      return (
        <>
          <option value={SMARTPHONES_TYPE.SMARTPHONES}>Cellulari e Smartphone</option>
          <option value={SMARTPHONES_TYPE.ACCESSORIES}>Accessori Telefonia</option>
          <option value={SMARTPHONES_TYPE.HOME_PHONE}>Fissi, Cordless e Altro</option>
        </>
      );
    case CATEGORY.CLOTHING:
      return (
        <>
          <option value="1">Felpe e maglioni</option>
          <option value="2">Giacche e giubbotti</option>
          <option value="3">Gonne</option>
          <option value="4">Pantaloni e jeans</option>
          <option value="5">Scarpe</option>
          <option value="6">Accessori</option>
          <option value="7">T-shirt e camicie</option>
          <option value="8">Intimo e pigiami</option>
          <option value="9">Vestiti e completi</option>
          <option value="10">Borse e zaini</option>
          <option value="12">Orologi e gioielli</option>
          <option value="11">Altro</option>
        </>
      );
    case CATEGORY.CHILDREN:
      return (
        <>
          <option value="1">Abbigliamento Bimbi</option>
          <option value="2">Prodotti per l&apos;infanzia</option>
          <option value="3">Giochi</option>
        </>
      );
    case CATEGORY.SPORTS:
      return (
        <>
          <option value="1">Calcio</option>
          <option value="2">Basket</option>
          <option value="3">Volley</option>
          <option value="4">Sci e Snowboard</option>
          <option value="5">Ciclismo</option>
          <option value="6">Acquatici</option>
          <option value="7">Palestra</option>
          <option value="8">Golf</option>
          <option value="9">Motori</option>
          <option value="10">Outdoor</option>
          <option value="11">Altro</option>
        </>
      );
    case CATEGORY.COLLECTIBLES:
      return (
        <>
          <option value="1">Francobolli</option>
          <option value="2">Monete</option>
          <option value="3">Cartoline</option>
          <option value="4">Militaria</option>
          <option value="5">Editoria</option>
          <option value="6">Carte e Schede</option>
          <option value="8">Modellismo</option>
          <option value="9">Modernariato</option>
          <option value="10">Bambole</option>
          <option value="7">Altro</option>
        </>
      );
    case CATEGORY.BOOKS:
      return (
        <>
          <option value="1">Libri scolastici e universitari</option>
          <option value="2">Letteratura e Narrativa</option>
          <option value="3">Gialli e Thriller</option>
          <option value="4">Biografie</option>
          <option value="5">Storia</option>
          <option value="6">Cucina</option>
          <option value="7">Fumetti</option>
          <option value="8">Libri per bambini</option>
          <option value="10">Altro</option>
        </>
      );
    case CATEGORY.BICYCLES:
      return (
        <>
          <option value="1">Uomo</option>
          <option value="2">Donna</option>
          <option value="3">Bimbo</option>
          <option value="4">MTB e Touring</option>
          <option value="5">Corsa</option>
          <option value="7">Pieghevoli</option>
          <option value="8">BMX</option>
          <option value="9">Scatto fisso e single speed</option>
          <option value="10">Componenti e abbigliamento</option>
          <option value="6">Altre tipologie</option>
        </>
      );
    default:
      return null;
  }
};

export default getOptionsForCategory;
