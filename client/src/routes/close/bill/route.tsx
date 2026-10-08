import { redirect, useActionData, useNavigate, useNavigation, useParams, useRouteLoaderData, type ActionFunctionArgs } from 'react-router';
import { api, type PaymentInput, type PaymentMethod, type StatementInput } from '../../../api';
import { BillDrawer } from '../../../components/BillDrawer';
import { formatAccount, parseMoney } from '../../../components/format';
import { showToast } from '../../../components/toast';
import { money, moneyOrNull, requirePeriodParam, str, strOrNull, toActionError, type ActionResult } from '../../helpers';
import type { CloseLoaderData } from '../route';

function parseStatement(form: FormData): StatementInput {
  const names = form.getAll('lineName').map(String);
  const amounts = form.getAll('lineAmount').map(String);
  const start = str(form, 'serviceStart');
  const end = str(form, 'serviceEnd');
  const lines = names.map((name, i) => ({ name, amount: parseMoney(amounts[i]) ?? Number.NaN }));
  return {
    statementDate: strOrNull(form, 'statementDate'),
    dueDate: str(form, 'dueDate'),
    lines,
    servicePeriod: start || end ? { start, end } : null,
    minimumDue: moneyOrNull(form, 'minimumDue'),
  };
}

function parsePayment(form: FormData, statement: StatementInput): PaymentInput {
  const choice = str(form, 'payChoice');
  const total = statement.lines.reduce((sum, l) => sum + l.amount, 0);
  const amount = choice === 'minimum' ? (statement.minimumDue ?? Number.NaN) : choice === 'other' ? money(form, 'otherAmount') : total;
  return {
    date: str(form, 'paymentDate'),
    accountId: str(form, 'accountId'),
    amount,
    method: str(form, 'method') as PaymentMethod,
    confirmation: strOrNull(form, 'confirmation'),
  };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const period = requirePeriodParam(params.period);
  const billId = params.billId!;
  const form = await request.formData();
  const intent = str(form, 'intent');
  const statement = parseStatement(form);
  try {
    const bill = await api.bills.get(billId);
    // Every action saves the statement first, so the amounts paid match what was entered.
    await api.periods.saveStatement(period, billId, statement);
    if (intent === 'schedule') {
      await api.periods.schedulePayment(period, billId, parsePayment(form, statement));
      showToast(`${bill.name} payment scheduled`);
    } else if (intent === 'pay') {
      const payment = parsePayment(form, statement);
      await api.periods.recordPayment(period, billId, payment);
      const account = await api.accounts.get(payment.accountId);
      showToast(`${bill.name} marked paid · added to ${formatAccount(account)} activity`);
    } else {
      showToast(`${bill.name} statement saved`);
    }
  } catch (error) {
    return toActionError(error);
  }
  return redirect(`/close/${period}`);
}

export default function CloseBill() {
  const { session, period, bills, accounts } = useRouteLoaderData('close') as CloseLoaderData;
  const { billId } = useParams();
  const result = useActionData<ActionResult>();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const bill = bills.find((b) => b.id === billId);
  const item = period.items.find((i) => i.billId === billId);
  if (!bill || !item) return null;

  return (
    <BillDrawer
      key={`${period.period}/${bill.id}`}
      bill={bill}
      item={item}
      accounts={accounts}
      today={session.today}
      readOnly={period.status === 'closed' || item.status === 'offcycle'}
      errors={result?.errors}
      formError={result?.formError}
      busy={navigation.state === 'submitting'}
      onClose={() => navigate(`/close/${period.period}`, { preventScrollReset: true })}
    />
  );
}
