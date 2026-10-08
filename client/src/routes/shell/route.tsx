import { Fragment } from 'react';
import { Link, NavLink, Outlet, useLoaderData } from 'react-router';
import { api } from '../../api';
import { Brand, Icon, type IconName } from '../../components/Icon';
import { initials } from '../../components/format';

export async function loader() {
  const session = await api.session.get();
  const period = await api.periods.get(session.currentPeriod);
  const openItems = period.items.filter((i) => i.status !== 'paid' && i.status !== 'offcycle').length;
  return { session, openItems };
}

const NAV: { section: string; links: { to: string; label: string; icon: IconName; end?: boolean; count?: boolean }[] }[] = [
  {
    section: 'Close',
    links: [
      { to: '/', label: 'Overview', icon: 'home', end: true },
      { to: '/close', label: 'Monthly close', icon: 'list', count: true },
      { to: '/reconcile', label: 'Reconcile', icon: 'scale' },
      { to: '/activity', label: 'Expenses & payments', icon: 'activity' },
    ],
  },
  {
    section: 'Setup',
    links: [
      { to: '/bills', label: 'Recurring bills', icon: 'bill' },
      { to: '/accounts', label: 'Accounts', icon: 'bank' },
    ],
  },
];

export default function Shell() {
  const { session, openItems } = useLoaderData<typeof loader>();
  const { user, household } = session;
  return (
    <div className="app">
      <aside className="rail">
        <Brand />
        <nav className="nav" aria-label="Main">
          {NAV.map((group) => (
            <Fragment key={group.section}>
              <div className="sect">{group.section}</div>
              {group.links.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.end}>
                  <Icon name={link.icon} />
                  <span className="lbl-t">{link.label}</span>
                  {link.count && (
                    <span className="count" aria-label={`${openItems} open`}>
                      {openItems}
                    </span>
                  )}
                </NavLink>
              ))}
            </Fragment>
          ))}
        </nav>
        <div className="rail-foot">
          <span className="avatar" aria-hidden="true">{initials(user.firstName, user.lastName)}</span>
          <div className="who">
            {user.firstName} {user.lastName}
            <br />
            <span>{household.name}</span>
          </div>
          <Link to="/login" title="Sign out" aria-label="Sign out">
            <Icon name="out" size={18} />
          </Link>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
