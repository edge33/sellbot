import SecondaryButton from '@renderer/ui/buttons/SecondaryButton';
import TertiaryButton from '@renderer/ui/buttons/TertiaryButton';
import Tooltip from '@renderer/ui/tooltip/Tooltip';
import { useState } from 'react';

type ActionButtonProps = {
  itemId: string;
  insertItem: (itemId: string) => Promise<void>;
  cloneItem: (itemId: string) => Promise<void>;
  deleteItem: (item: string) => Promise<void>;
  removeListing: (item: string) => Promise<void>;
};

enum ACTION {
  REMOVE_LISTING = 'REMOVE_LISTING',
  DELETE_FILE = 'DELETE_FILE'
}

const ActionButtons = ({
  itemId,
  insertItem,
  cloneItem,
  deleteItem,
  removeListing
}: ActionButtonProps) => {
  const [actionToPerform, setActionToPerform] = useState<ACTION>();

  const executeAction = () => {
    if (!actionToPerform) {
      return;
    }
    switch (actionToPerform) {
      case ACTION.DELETE_FILE: {
        deleteItem(itemId);
        break;
      }
      case ACTION.REMOVE_LISTING: {
        removeListing(itemId);
        break;
      }
      default: {
        //@ts-ignore
        const _exaustiveCheck: never = actionToPerform;
      }
    }
    setActionToPerform(undefined);
  };

  return (
    <>
      {!actionToPerform && (
        <Tooltip text="Inserisci su subito">
          <button
            className="hover:text-primary"
            onClick={() => {
              insertItem(itemId);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 512 512"
              className="fill-current"
              width="18"
              height="18"
              fill="none"
            >
              <path d="M288 109.3V352c0 17.7-14.3 32-32 32s-32-14.3-32-32V109.3l-73.4 73.4c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l128-128c12.5-12.5 32.8-12.5 45.3 0l128 128c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L288 109.3zM64 352h128c0 35.3 28.7 64 64 64s64-28.7 64-64h128c35.3 0 64 28.7 64 64v32c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64v-32c0-35.3 28.7-64 64-64zm368 104a24 24 0 100-48 24 24 0 100 48z"></path>
            </svg>
          </button>
        </Tooltip>
      )}
      {actionToPerform ? (
        <>
          <SecondaryButton
            action={() => {
              executeAction();
            }}
            label="Conferma"
          />
          <TertiaryButton
            action={() => {
              setActionToPerform(undefined);
            }}
            label="Annulla"
          />
        </>
      ) : (
        <>
          <Tooltip text="Elimina prodotto">
            <button
              className="hover:text-primary"
              onClick={() => {
                setActionToPerform(ACTION.DELETE_FILE);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 448 512"
                className="fill-current"
                width="18"
                height="18"
                fill="none"
              >
                <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64s14.3 32 32 32h384c17.7 0 32-14.3 32-32s-14.3-32-32-32h-96l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32l21.2 339c1.6 25.3 22.6 45 47.9 45h245.8c25.3 0 46.3-19.7 47.9-45L416 128z"></path>
              </svg>
            </button>
          </Tooltip>

          <Tooltip text="Rimuovi da subito">
            <button
              className="hover:text-primary"
              onClick={() => {
                setActionToPerform(ACTION.REMOVE_LISTING);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 640 512 "
                className="fill-current"
                width="18"
                height="18"
                fill="none"
              >
                <path d="M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2s-6.3 25.5 4.1 33.7l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L489.3 358.2l90.5-90.5c56.5-56.5 56.5-148 0-204.5-50-50-128.8-56.5-186.3-15.4l-1.6 1.1c-14.4 10.3-17.7 30.3-7.4 44.6s30.3 17.7 44.6 7.4l1.6-1.1c32.1-22.9 76-19.3 103.8 8.6 31.5 31.5 31.5 82.5 0 114l-96 96-31.9-25c24.3-53.8 13.5-118.3-29.6-161.4-52.2-52.3-134.5-56.2-191.3-11.7L38.8 5.1zM239 162c30.1-14.9 67.7-9.9 92.8 15.3 20 20 27.5 48.3 21.7 74.5L239 162zm167.6 254.4L220.9 270c-2.1 39.8 12.2 80.1 42.2 110 38.9 38.9 94.4 51 143.6 36.3zm-290-228.5l-56.4 56.4c-56.5 56.5-56.5 148 0 204.5 50 50 128.8 56.5 186.3 15.4l1.6-1.1c14.4-10.3 17.7-30.3 7.4-44.6s-30.3-17.7-44.6-7.4l-1.6 1.1c-32.1 22.9-76 19.3-103.8-8.6C74 372 74 321 105.5 289.5l61.8-61.8-50.6-39.9z"></path>
              </svg>
            </button>
          </Tooltip>

          <Tooltip text="Duplica prodotto">
            <button
              className="hover:text-primary"
              onClick={() => {
                cloneItem(itemId);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 512 512"
                className="fill-current"
                width="18"
                height="18"
                fill="none"
              >
                <path d="M288 448H64V224h64v-64H64c-35.3 0-64 28.7-64 64v224c0 35.3 28.7 64 64 64h224c35.3 0 64-28.7 64-64v-64h-64v64zm-64-96h224c35.3 0 64-28.7 64-64V64c0-35.3-28.7-64-64-64H224c-35.3 0-64 28.7-64 64v224c0 35.3 28.7 64 64 64z"></path>
              </svg>
            </button>
          </Tooltip>
        </>
      )}
    </>
  );
};

export default ActionButtons;
