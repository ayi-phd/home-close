import { redirect, useActionData, useLoaderData, useNavigate, useNavigation, useRouteLoaderData, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { api, type AccountInput, type AccountType } from '../../../api';
import { periodStart } from '../../../api/dates';
import { AccountForm } from '../../../components/AccountForm';
import { showToast } from '../../../components/toast';
import { money, str, toActionError, type ActionResult } from '../../helpers';
import type { AccountsLoaderData } from '../route';

/** Serves both /accounts/new and /accounts/:accountId/edit. */
export async function loader({ params }: LoaderFunctionArgs) {
  if (!params.accountId) return { account: null };
  return { account: await api.accounts.get(params.accountId) };
}

function parseAccount(form: FormData): AccountInput {
  return {
    name: str(form, 'name'),
    institution: str(form, 'institution'),
    type: str(form, 'type') as AccountType,
    last4: str(form, 'last4'),
    openingBalance: money(form, 'openingBalance'),
    openingDate: str(form, 'openingDate'),
  };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const input = parseAccount(await request.formData());
  try {
    if (params.accountId) {
      await api.accounts.update(params.accountId, input);
      showToast(`${input.name} updated`);
    } else {
      await api.accounts.create(input);
      showToast(`${input.name} added`);
    }
  } catch (error) {
    return toActionError(error);
  }
  return redirect('/accounts');
}

export default function EditAccount() {
  const { account } = useLoaderData<typeof loader>();
  const { session } = useRouteLoaderData('accounts') as AccountsLoaderData;
  const result = useActionData<ActionResult>();
  const navigate = useNavigate();
  const navigation = useNavigation();
  return (
    <AccountForm
      key={account?.id ?? 'new'}
      account={account ?? undefined}
      defaultDate={periodStart(session.currentPeriod)}
      errors={result?.errors}
      formError={result?.formError}
      busy={navigation.state === 'submitting'}
      onClose={() => navigate('/accounts', { preventScrollReset: true })}
    />
  );
}
