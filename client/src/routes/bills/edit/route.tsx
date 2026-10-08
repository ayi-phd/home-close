import { redirect, useActionData, useLoaderData, useLocation, useNavigate, useNavigation, useRouteLoaderData, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { api, type BillCategory, type BillInput, type DefaultPayment, type Frequency } from '../../../api';
import { BillForm } from '../../../components/BillForm';
import { parseMoney } from '../../../components/format';
import { showToast } from '../../../components/toast';
import { intOrNull, money, str, toActionError, type ActionResult } from '../../helpers';
import type { BillsLoaderData } from '../route';

/** Serves both /bills/new and /bills/:billId/edit. */
export async function loader({ params }: LoaderFunctionArgs) {
  if (!params.billId) return { bill: null };
  return { bill: await api.bills.get(params.billId) };
}

function parseBill(form: FormData): BillInput {
  const category = str(form, 'category') as BillCategory;
  const frequency = str(form, 'frequency') as Frequency;
  const dueValue = intOrNull(form, 'dueValue') ?? Number.NaN;
  const apr = str(form, 'loanApr');
  return {
    name: str(form, 'name'),
    category,
    lines: form.getAll('lines').map((l) => String(l).trim()).filter(Boolean),
    frequency,
    cycleAnchorMonth: frequency === 'monthly' ? null : intOrNull(form, 'cycleAnchorMonth'),
    statementDay: intOrNull(form, 'statementDay'),
    dueRule: str(form, 'dueKind') === 'days-after-statement' ? { kind: 'days-after-statement', days: dueValue } : { kind: 'fixed-day', day: dueValue },
    amountType: form.has('fixedAmount') ? 'fixed' : 'varies',
    typicalAmount: money(form, 'typicalAmount'),
    accountId: str(form, 'accountId'),
    autopay: form.has('autopay'),
    reference: str(form, 'reference'),
    defaultPayment: category === 'credit-card' ? ((str(form, 'defaultPayment') || 'statement') as DefaultPayment) : null,
    loan:
      category === 'loan'
        ? {
            balance: money(form, 'loanBalance'),
            paymentsLeft: intOrNull(form, 'loanPaymentsLeft') ?? Number.NaN,
            // "4.9" → 490 basis points, parsed as hundredths like money so no floats are involved.
            aprBps: apr === '' ? null : (parseMoney(apr) ?? Number.NaN),
          }
        : null,
  };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const form = await request.formData();
  const input = parseBill(form);
  try {
    if (params.billId) {
      await api.bills.update(params.billId, input);
      showToast(`${input.name} updated`);
    } else {
      await api.bills.create(input);
      showToast(`${input.name} added to recurring bills`);
    }
  } catch (error) {
    return toActionError(error);
  }
  return redirect(`/bills${new URL(request.url).search}`);
}

export default function EditBill() {
  const { bill } = useLoaderData<typeof loader>();
  const { accounts } = useRouteLoaderData('bills') as BillsLoaderData;
  const result = useActionData<ActionResult>();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const { search } = useLocation();
  return (
    <BillForm
      key={bill?.id ?? 'new'}
      bill={bill ?? undefined}
      accounts={accounts}
      errors={result?.errors}
      formError={result?.formError}
      busy={navigation.state === 'submitting'}
      onClose={() => navigate(`/bills${search}`, { preventScrollReset: true })}
    />
  );
}
