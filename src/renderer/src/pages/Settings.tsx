import { useRef, useState } from 'react';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import { useSettingsContext } from '../Context/context';
import { AppSettings } from '@shared/types';

type ErrorState = { [K in keyof AppSettings]?: string };

const Settings = () => {
  const inputItemsPathRef = useRef<HTMLInputElement>(null);
  const inputChromiumPathRef = useRef<HTMLInputElement>(null);
  const inputMobilePhoneRef = useRef<HTMLInputElement>(null);

  const [errorState, setErrorState] = useState<ErrorState>({});
  const { appSettings, updateConfig } = useSettingsContext();

  const { cookiesStored, itemsPath, chromiumPath, mobilePhone } = appSettings;

  const handlePathSave = async () => {
    const itemsPathValue_ = inputItemsPathRef.current?.value;
    const chromiumPath_ = inputChromiumPathRef.current?.files?.[0]?.path;
    const mobilePhoneValue_ = inputMobilePhoneRef.current?.value;

    if (!itemsPathValue_?.trim().length) {
      setErrorState((errorState) => ({
        ...errorState,
        itemsPath: 'Il campo non può essere vuoto'
      }));
      return;
    } else {
      setErrorState((errorState) => ({ ...errorState, itemsPath: undefined }));
    }
    const itemsPathValue = itemsPathValue_;

    if (!chromiumPath_?.trim().length && !chromiumPath) {
      setErrorState((errorState) => ({
        ...errorState,
        chromiumPath: 'Il campo non può essere vuoto'
      }));
      return;
    } else {
      setErrorState((errorState) => ({
        ...errorState,
        chromiumPath: undefined
      }));
    }

    let chromiumPathValue = '';
    if (!chromiumPath_?.trim().length && chromiumPath) {
      chromiumPathValue = chromiumPath;
    } else {
      chromiumPathValue = chromiumPath_ as string;
    }

    if (!mobilePhoneValue_?.trim().length) {
      setErrorState((errorState) => ({
        ...errorState,
        mobilePhone: 'Il campo non può essere vuoto'
      }));
      return;
    } else {
      setErrorState((errorState) => ({ ...errorState, itemsPath: undefined }));
    }

    const mobilePhoneValue = mobilePhoneValue_;

    try {
      await window.storeSettings({
        itemsPath: itemsPathValue,
        chromiumPath: chromiumPathValue,
        mobilePhone: mobilePhoneValue
      });

      updateConfig();
    } catch (err) {
      console.log(err);
      setErrorState((errorState) => ({
        ...errorState,
        general: 'Impossibile salvare il percorso'
      }));
    }
  };

  if (itemsPath && inputItemsPathRef.current) {
    inputItemsPathRef.current.value = itemsPath;
  }

  if (mobilePhone && inputMobilePhoneRef.current) {
    inputMobilePhoneRef.current.value = mobilePhone;
  }

  const openWebsite = () => {
    window.auth();
  };

  const storeCookies = async () => {
    await window.storeCookies();
    updateConfig();
  };

  return (
    <>
      <div className="mx-auto max-w-270">
        <Breadcrumb pageName="Settings" />

        {(!itemsPath || !chromiumPath || !mobilePhone) && (
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-7.5">
            <div className="border-stroke py-4 px-7 dark:border-strokedark">
              <div className="flex w-full border-l-6 border-warning bg-warning bg-opacity-[15%] px-7 py-8 shadow-md dark:bg-[#1B1B24] dark:bg-opacity-30 md:p-9">
                <div className="mr-5 flex h-9 w-9 items-center justify-center rounded-lg bg-warning bg-opacity-30">
                  <svg
                    width="19"
                    height="16"
                    viewBox="0 0 19 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M1.50493 16H17.5023C18.6204 16 19.3413 14.9018 18.8354 13.9735L10.8367 0.770573C10.2852 -0.256858 8.70677 -0.256858 8.15528 0.770573L0.156617 13.9735C-0.334072 14.8998 0.386764 16 1.50493 16ZM10.7585 12.9298C10.7585 13.6155 10.2223 14.1433 9.45583 14.1433C8.6894 14.1433 8.15311 13.6155 8.15311 12.9298V12.9015C8.15311 12.2159 8.6894 11.688 9.45583 11.688C10.2223 11.688 10.7585 12.2159 10.7585 12.9015V12.9298ZM8.75236 4.01062H10.2548C10.6674 4.01062 10.9127 4.33826 10.8671 4.75288L10.2071 10.1186C10.1615 10.5049 9.88572 10.7455 9.50142 10.7455C9.11929 10.7455 8.84138 10.5028 8.79579 10.1186L8.13574 4.75288C8.09449 4.33826 8.33984 4.01062 8.75236 4.01062Z"
                      fill="#FBBF24"
                    ></path>
                  </svg>
                </div>
                <div className="w-full">
                  <h5 className="mb-3 text-lg font-semibold text-[#9D5425]">Attenzione</h5>
                  <p className="leading-relaxed text-[#D0915C]">
                    La configurazione è incompleta controllare i campi
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-5 gap-8">
          <div className="col-span-5">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
                <h3 className="font-medium text-black dark:text-white">
                  Autenticazione
                  {!cookiesStored && (
                    <>
                      {' '}
                      - <span className="font-semibold text-[#B45454]">Cookie non salvati</span>
                    </>
                  )}
                </h3>
              </div>
              <div className="p-7">
                <div className="flex gap-4.5">
                  <button
                    onClick={openWebsite}
                    className="flex justify-center rounded bg-primary py-2 px-6 font-medium text-gray hover:bg-opacity-90"
                    type="submit"
                  >
                    Apri subito.it
                  </button>
                  <button
                    onClick={storeCookies}
                    className="flex justify-center rounded bg-primary py-2 px-6 font-medium text-gray hover:bg-opacity-90"
                    type="submit"
                  >
                    Salva cookies
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-8 mt-7.5">
          <div className="col-span-5">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
                <h3 className="font-medium text-black dark:text-white">Configurazione</h3>
              </div>
              <div className="p-7">
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    handlePathSave();
                  }}
                >
                  <div className="mb-5.5">
                    <label
                      className="mb-3 block text-sm font-medium text-black dark:text-white"
                      htmlFor="itemsPath"
                    >
                      Percorso inserzioni{' '}
                      {!itemsPath && (
                        <>
                          {' '}
                          - <span className="text-[#B45454]">Non configurato</span>
                        </>
                      )}
                    </label>
                    <input
                      ref={inputItemsPathRef}
                      className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                      type="text"
                      name="itemsPath"
                      id="itemsPath"
                      placeholder=""
                      defaultValue={itemsPath}
                    />
                  </div>

                  {errorState.itemsPath && (
                    <div className="mt-7.5 mb-7.5 flex w-full border-l-6 border-[#F87171] bg-[#F87171] bg-opacity-[15%] px-7 py-8 shadow-md dark:bg-[#1B1B24] dark:bg-opacity-30 md:p-9">
                      <div className="mr-5 flex h-9 w-full max-w-[36px] items-center justify-center rounded-lg bg-[#F87171]">
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 13 13"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M6.4917 7.65579L11.106 12.2645C11.2545 12.4128 11.4715 12.5 11.6738 12.5C11.8762 12.5 12.0931 12.4128 12.2416 12.2645C12.5621 11.9445 12.5623 11.4317 12.2423 11.1114C12.2422 11.1113 12.2422 11.1113 12.2422 11.1113C12.242 11.1111 12.2418 11.1109 12.2416 11.1107L7.64539 6.50351L12.2589 1.91221L12.2595 1.91158C12.5802 1.59132 12.5802 1.07805 12.2595 0.757793C11.9393 0.437994 11.4268 0.437869 11.1064 0.757418C11.1063 0.757543 11.1062 0.757668 11.106 0.757793L6.49234 5.34931L1.89459 0.740581L1.89396 0.739942C1.57364 0.420019 1.0608 0.420019 0.740487 0.739944C0.42005 1.05999 0.419837 1.57279 0.73985 1.89309L6.4917 7.65579ZM6.4917 7.65579L1.89459 12.2639L1.89395 12.2645C1.74546 12.4128 1.52854 12.5 1.32616 12.5C1.12377 12.5 0.906853 12.4128 0.758361 12.2645L1.1117 11.9108L0.758358 12.2645C0.437984 11.9445 0.437708 11.4319 0.757539 11.1116C0.757812 11.1113 0.758086 11.111 0.75836 11.1107L5.33864 6.50287L0.740487 1.89373L6.4917 7.65579Z"
                            fill="#ffffff"
                            stroke="#ffffff"
                          ></path>
                        </svg>
                      </div>
                      <div className="w-full">
                        <h5 className="mb-3 font-semibold text-[#B45454]">Errore</h5>
                        <ul>
                          <li className="leading-relaxed text-[#CD5D5D]">{errorState.itemsPath}</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="mb-5.5">
                    <div>
                      <label
                        className="mb-3 block text-sm font-medium text-black dark:text-white"
                        htmlFor="chromiumPath"
                      >
                        Percorso chromium{' '}
                        {!chromiumPath && (
                          <>
                            {' '}
                            - <span className="text-[#B45454]">Non configurato</span>
                          </>
                        )}
                      </label>
                      <div className="mb-3">{chromiumPath}</div>
                      <input
                        ref={inputChromiumPathRef}
                        type="file"
                        className="w-full cursor-pointer rounded-lg border-[1.5px] border-stroke bg-transparent outline-none transition file:mr-5 file:border-collapse file:cursor-pointer file:border-0 file:border-r file:border-solid file:border-stroke file:bg-whiter file:py-3 file:px-5 file:hover:bg-primary file:hover:bg-opacity-10 focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:file:border-form-strokedark dark:file:bg-white/30 dark:file:text-white dark:focus:border-primary"
                        name="chromiumPath"
                        id="chromiumPath"
                        placeholder=""
                      />
                    </div>
                  </div>

                  {errorState?.chromiumPath && (
                    <div className="mt-7.5 mb-7.5 flex w-full border-l-6 border-[#F87171] bg-[#F87171] bg-opacity-[15%] px-7 py-8 shadow-md dark:bg-[#1B1B24] dark:bg-opacity-30 md:p-9">
                      <div className="mr-5 flex h-9 w-full max-w-[36px] items-center justify-center rounded-lg bg-[#F87171]">
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 13 13"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M6.4917 7.65579L11.106 12.2645C11.2545 12.4128 11.4715 12.5 11.6738 12.5C11.8762 12.5 12.0931 12.4128 12.2416 12.2645C12.5621 11.9445 12.5623 11.4317 12.2423 11.1114C12.2422 11.1113 12.2422 11.1113 12.2422 11.1113C12.242 11.1111 12.2418 11.1109 12.2416 11.1107L7.64539 6.50351L12.2589 1.91221L12.2595 1.91158C12.5802 1.59132 12.5802 1.07805 12.2595 0.757793C11.9393 0.437994 11.4268 0.437869 11.1064 0.757418C11.1063 0.757543 11.1062 0.757668 11.106 0.757793L6.49234 5.34931L1.89459 0.740581L1.89396 0.739942C1.57364 0.420019 1.0608 0.420019 0.740487 0.739944C0.42005 1.05999 0.419837 1.57279 0.73985 1.89309L6.4917 7.65579ZM6.4917 7.65579L1.89459 12.2639L1.89395 12.2645C1.74546 12.4128 1.52854 12.5 1.32616 12.5C1.12377 12.5 0.906853 12.4128 0.758361 12.2645L1.1117 11.9108L0.758358 12.2645C0.437984 11.9445 0.437708 11.4319 0.757539 11.1116C0.757812 11.1113 0.758086 11.111 0.75836 11.1107L5.33864 6.50287L0.740487 1.89373L6.4917 7.65579Z"
                            fill="#ffffff"
                            stroke="#ffffff"
                          ></path>
                        </svg>
                      </div>
                      <div className="w-full">
                        <h5 className="mb-3 font-semibold text-[#B45454]">Errore</h5>
                        <ul>
                          <li className="leading-relaxed text-[#CD5D5D]">
                            {errorState.chromiumPath}
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="mb-5.5">
                    <label
                      className="mb-3 block text-sm font-medium text-black dark:text-white"
                      htmlFor="mobilePhone"
                    >
                      Numero di telefono{' '}
                      {!mobilePhone && (
                        <>
                          {' '}
                          - <span className="text-[#B45454]">Non configurato</span>
                        </>
                      )}
                    </label>
                    <input
                      ref={inputMobilePhoneRef}
                      className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                      type="text"
                      name="mobilePhone"
                      id="mobilePhone"
                      placeholder=""
                      defaultValue={mobilePhone}
                    />
                  </div>

                  {errorState?.mobilePhone && (
                    <div className="mt-7.5 mb-7.5 flex w-full border-l-6 border-[#F87171] bg-[#F87171] bg-opacity-[15%] px-7 py-8 shadow-md dark:bg-[#1B1B24] dark:bg-opacity-30 md:p-9">
                      <div className="mr-5 flex h-9 w-full max-w-[36px] items-center justify-center rounded-lg bg-[#F87171]">
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 13 13"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M6.4917 7.65579L11.106 12.2645C11.2545 12.4128 11.4715 12.5 11.6738 12.5C11.8762 12.5 12.0931 12.4128 12.2416 12.2645C12.5621 11.9445 12.5623 11.4317 12.2423 11.1114C12.2422 11.1113 12.2422 11.1113 12.2422 11.1113C12.242 11.1111 12.2418 11.1109 12.2416 11.1107L7.64539 6.50351L12.2589 1.91221L12.2595 1.91158C12.5802 1.59132 12.5802 1.07805 12.2595 0.757793C11.9393 0.437994 11.4268 0.437869 11.1064 0.757418C11.1063 0.757543 11.1062 0.757668 11.106 0.757793L6.49234 5.34931L1.89459 0.740581L1.89396 0.739942C1.57364 0.420019 1.0608 0.420019 0.740487 0.739944C0.42005 1.05999 0.419837 1.57279 0.73985 1.89309L6.4917 7.65579ZM6.4917 7.65579L1.89459 12.2639L1.89395 12.2645C1.74546 12.4128 1.52854 12.5 1.32616 12.5C1.12377 12.5 0.906853 12.4128 0.758361 12.2645L1.1117 11.9108L0.758358 12.2645C0.437984 11.9445 0.437708 11.4319 0.757539 11.1116C0.757812 11.1113 0.758086 11.111 0.75836 11.1107L5.33864 6.50287L0.740487 1.89373L6.4917 7.65579Z"
                            fill="#ffffff"
                            stroke="#ffffff"
                          ></path>
                        </svg>
                      </div>
                      <div className="w-full">
                        <h5 className="mb-3 font-semibold text-[#B45454]">Errore</h5>
                        <ul>
                          <li className="leading-relaxed text-[#CD5D5D]">
                            {errorState.mobilePhone}
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </form>

                <div className="flex gap-4.5">
                  <button
                    onClick={handlePathSave}
                    className="flex justify-center rounded bg-primary py-2 px-6 font-medium text-gray hover:bg-opacity-90"
                    type="submit"
                  >
                    Salva
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Settings;
