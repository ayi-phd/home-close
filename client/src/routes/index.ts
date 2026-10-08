import { redirect, type RouteObject } from 'react-router';
import Root, { ErrorBoundary, HydrateFallback } from './root/route';
import * as login from './login/route';
import * as signup from './signup/route';
import * as shell from './shell/route';
import * as overview from './overview/route';
import * as close from './close/route';
import * as closeBill from './close/bill/route';
import * as reconcile from './reconcile/route';
import * as activity from './activity/route';
import * as bills from './bills/route';
import * as billEdit from './bills/edit/route';
import * as accounts from './accounts/route';
import * as accountEdit from './accounts/edit/route';

const billEditRoute = { loader: billEdit.loader, action: billEdit.action, Component: billEdit.default };
const accountEditRoute = { loader: accountEdit.loader, action: accountEdit.action, Component: accountEdit.default };

/** Data-mode route table. Each screen is one module exporting loader, action and Component. */
export const routes: RouteObject[] = [
  {
    path: '/',
    Component: Root,
    ErrorBoundary,
    HydrateFallback,
    children: [
      { path: 'login', action: login.action, Component: login.default },
      { path: 'signup', loader: signup.loader, action: signup.action, Component: signup.default },
      {
        id: 'shell',
        loader: shell.loader,
        Component: shell.default,
        ErrorBoundary,
        children: [
          { index: true, loader: overview.loader, action: overview.action, Component: overview.default },
          { path: 'close', loader: close.indexLoader },
          {
            id: 'close',
            path: 'close/:period',
            loader: close.loader,
            action: close.action,
            Component: close.default,
            children: [{ path: 'bills/:billId', action: closeBill.action, Component: closeBill.default }],
          },
          { path: 'reconcile', loader: reconcile.indexLoader },
          { path: 'reconcile/:accountId', loader: reconcile.loader, action: reconcile.action, Component: reconcile.default },
          { path: 'activity', loader: activity.loader, action: activity.action, Component: activity.default },
          {
            id: 'bills',
            path: 'bills',
            loader: bills.loader,
            Component: bills.default,
            children: [
              { path: 'new', ...billEditRoute },
              { path: ':billId/edit', ...billEditRoute },
            ],
          },
          {
            id: 'accounts',
            path: 'accounts',
            loader: accounts.loader,
            Component: accounts.default,
            children: [
              { path: 'new', ...accountEditRoute },
              { path: ':accountId/edit', ...accountEditRoute },
            ],
          },
          { path: '*', loader: () => redirect('/') },
        ],
      },
    ],
  },
];
