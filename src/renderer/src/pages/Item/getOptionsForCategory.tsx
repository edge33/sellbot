import { AUDIO_VIDEO_TYPE, CATEGORY, COMPUTER_SCIENCE_TYPE, SMARTPHONES_TYPE } from './schema';

const getOptionsForCategory = (
  category: CATEGORY.COMPUTER_SCIENCE | CATEGORY.AUDIO_VIDEO | CATEGORY.SMARTPHONES
) => {
  switch (category) {
    case CATEGORY.COMPUTER_SCIENCE: {
      return (
        <>
          <option value={COMPUTER_SCIENCE_TYPE.NOTEBOOK} className="text-body dark:text-bodydark">
            NoteBook & Tablet
          </option>
          <option value={COMPUTER_SCIENCE_TYPE.DESKTOP} className="text-body dark:text-bodydark">
            Computer Fissi
          </option>
          <option
            value={COMPUTER_SCIENCE_TYPE.ACCESSORIES}
            className="text-body dark:text-bodydark"
          >
            Accessori
          </option>
        </>
      );
    }
    case CATEGORY.AUDIO_VIDEO: {
      return (
        <>
          <option value={AUDIO_VIDEO_TYPE.TV} className="text-body dark:text-bodydark">
            TV
          </option>
          <option value={AUDIO_VIDEO_TYPE.DVD_PLAYERS} className="text-body dark:text-bodydark">
            Lettori DVD
          </option>
          <option value={AUDIO_VIDEO_TYPE.RADIO_STEREO} className="text-body dark:text-bodydark">
            Radio/Stereo
          </option>
          <option value={AUDIO_VIDEO_TYPE.MP3_PLAYERS} className="text-body dark:text-bodydark">
            Lettori MP3
          </option>
          <option value={AUDIO_VIDEO_TYPE.MISC} className="text-body dark:text-bodydark">
            Altro
          </option>
        </>
      );
    }
    case CATEGORY.SMARTPHONES: {
      return (
        <>
          <option value={SMARTPHONES_TYPE.SMARTPHONES} className="text-body dark:text-bodydark">
            Cellulari e Smartphone
          </option>
          <option value={SMARTPHONES_TYPE.ACCESSORIES} className="text-body dark:text-bodydark">
            Accessori Telefonia
          </option>
          <option value={SMARTPHONES_TYPE.HOME_PHONE} className="text-body dark:text-bodydark">
            Fissi, Cordless e Altro
          </option>
        </>
      );
    }
  }
};

export default getOptionsForCategory;
