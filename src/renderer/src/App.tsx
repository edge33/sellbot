import {
  createHashRouter,
  createRoutesFromElements,
  replace,
  Route,
  RouterProvider
} from 'react-router-dom';
import Loader from './common/Loader';
import PageTitle from './components/PageTitle';
import { useSettingsContext } from './Context/context';
import Products from './pages/Dashboard/Products';
import Settings from './pages/Settings';
import DefaultLayout from './ui/layout/DefaultLayout';
import { AppSettings } from '@shared/types';

const isMissingConfig = (appSettings: AppSettings) => {
  const { chromiumPath, cookiesStored, mobilePhone, itemsPath } = appSettings;

  return !chromiumPath || !cookiesStored || !mobilePhone || !itemsPath;
};

function App() {
  const { loading, appSettings } = useSettingsContext();

  const router = createHashRouter(
    createRoutesFromElements(
      <Route path="/" element={<DefaultLayout />}>
        <>
          <Route
            index
            loader={async () => {
              if (!loading && isMissingConfig(appSettings)) {
                return replace('/settings');
              }
              return null;
            }}
            element={
              <>
                <PageTitle title="Products | Sellbot" />
                <Products />
              </>
            }
          />
          <Route
            path="/settings"
            element={
              <>
                <PageTitle title="Settings | Sellbot" />
                <Settings />
              </>
            }
          />
        </>
      </Route>
    )
  );

  return loading ? <Loader /> : <RouterProvider router={router} />;
}

export default App;
