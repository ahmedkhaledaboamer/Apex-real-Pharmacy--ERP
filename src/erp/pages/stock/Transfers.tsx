import { useMemo, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowLeftRight, ArrowRight, PackageCheck, Plus, Send, Trash2, X } from 'lucide-react';
import { useTranslations } from '../../../lib/i18n';
import { useCatalog, useCurrentBranch, useErpState, useFmt, useName } from '../../hooks';
import { dispatchTransfer, erp, nowISO, receiveTransfer, stockOf } from '../../store';
import type { ID, Transfer, TransferStatus } from '../../types';
import { Button, Card, CardHeader, ConfirmDialog, DataTable, EmptyState, Field, Input, KeyValue, Modal, PageHeader, Select, StatusBadge, Tabs, Textarea, Toolbar, type Column } from '../../ui/kit';
import { useToast } from '../../../components/ui/Toast';
import { errText, ProductCell, ProductPicker, useBranchLookup, useBranchName, useTs } from './shared';

function NewTransferModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTs();
  const tc = useTranslations('Erp.common');
  const toast = useToast();
  const d = useErpState();
  const branch = useCurrentBranch();
  const { branches } = useCatalog();
  const bn = useBranchName();
  const [from, setFrom] = useState(branch?._id ?? '');
  const [to, setTo] = useState(branches.find((b) => b._id !== branch?._id)?._id ?? '');
  const [items, setItems] = useState<{ productId: ID; qty: number }[]>([]);
  const [notes, setNotes] = useState('');
  const avail = (id: ID) => stockOf(d, id, from);
  const valid = from && to && from !== to && items.length > 0 && items.every((i) => i.qty > 0 && i.qty <= avail(i.productId));
  const submit = () => {
    if (!valid) return;
    const now = nowISO();
    erp.insert('transfers', { number: erp.nextNumber('transfer', 'TR'), fromBranchId: from, toBranchId: to, items, status: 'pending', notes: notes || undefined, createdAt: now, updatedAt: now });
    toast.success(t('transfers.created'));
    setItems([]);
    setNotes('');
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={t('transfers.new')}
      subtitle={t('transfers.newSub')}
      footer={
        <>
          <Button onClick={onClose}>{tc('cancel')}</Button>
          <Button variant="primary" disabled={!valid} onClick={submit}>
            {tc('create')}
          </Button>
        </>
      }>
      <div className="grid sm:grid-cols-[1fr_auto_1fr] items-end gap-3 mb-5">
        <Field label={tc('from')}>
          <Select value={from} onChange={(e) => setFrom(e.target.value)}>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {bn(b)}
              </option>
            ))}
          </Select>
        </Field>
        <span className="hidden sm:flex h-10 items-center text-slate-400">
          <ArrowRight className="w-5 h-5 rtl:rotate-180" />
        </span>
        <Field label={tc('to')} error={from === to ? t('transfers.sameBranch') : undefined}>
          <Select value={to} onChange={(e) => setTo(e.target.value)}>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {bn(b)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="space-y-2 mb-3">
        {items.map((it, i) => {
          const a = avail(it.productId);
          return (
            <div key={it.productId} className="flex items-center gap-3 rounded-xl border border-slate-200 p-2.5">
              <div className="flex-1 min-w-0">
                <ProductCell id={it.productId} sub={t('transfers.available', { n: a })} />
              </div>
              <Input type="number" min={1} max={a} value={it.qty} onChange={(e) => setItems(items.map((x, k) => (k === i ? { ...x, qty: Math.max(0, Math.floor(Number(e.target.value))) } : x)))} className={`!w-24 text-center ${it.qty > a ? '!border-rose-400' : ''}`} />
              <button onClick={() => setItems(items.filter((_, k) => k !== i))} className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" aria-label={tc('delete')}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
      <ProductPicker exclude={items.map((i) => i.productId)} onPick={(id) => setItems([...items, { productId: id, qty: Math.min(1, avail(id)) || 1 }])} />
      <Field label={tc('notes')} className="mt-4">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Modal>
  );
}

function useTransferActions() {
  const t = useTs();
  const tr = useTranslations();
  const toast = useToast();
  const name = useName();
  const { productMap } = useCatalog();
  return {
    dispatch: (x: Transfer) => {
      try {
        dispatchTransfer(x._id);
        toast.success(t('transfers.dispatched'));
      } catch (e) {
        toast.error(errText(tr, e, (id) => name(productMap.get(id))));
      }
    },
    receive: (x: Transfer) => {
      receiveTransfer(x._id);
      toast.success(t('transfers.receivedOk'));
    },
    cancel: (x: Transfer) => {
      erp.update('transfers', x._id, { status: 'cancelled', updatedAt: nowISO() });
      toast.success(t('transfers.cancelledOk'));
    }
  };
}

function TransferActions({ x, onCancel }: { x: Transfer; onCancel: () => void }) {
  const t = useTs();
  const a = useTransferActions();
  return (
    <span className="inline-flex gap-1" onClick={(e) => e.stopPropagation()}>
      {x.status === 'pending' && (
        <>
          <Button size="sm" variant="soft" icon={Send} onClick={() => a.dispatch(x)}>
            {t('transfers.dispatch')}
          </Button>
          <Button size="sm" variant="ghost" icon={X} onClick={onCancel}>
            {t('transfers.cancel')}
          </Button>
        </>
      )}
      {x.status === 'in_transit' && (
        <Button size="sm" variant="soft" icon={PackageCheck} onClick={() => a.receive(x)}>
          {t('transfers.receive')}
        </Button>
      )}
    </span>
  );
}

function TransferList() {
  const t = useTs();
  const tc = useTranslations('Erp.common');
  const fmt = useFmt();
  const navigate = useNavigate();
  const d = useErpState();
  const bl = useBranchLookup();
  const actions = useTransferActions();
  const [tab, setTab] = useState<'all' | TransferStatus>('all');
  const [open, setOpen] = useState(false);
  const [cancel, setCancel] = useState<Transfer | null>(null);
  const list = useMemo(() => [...d.transfers].reverse(), [d]);
  const rows = tab === 'all' ? list : list.filter((x) => x.status === tab);
  const count = (s: TransferStatus) => list.filter((x) => x.status === s).length;
  const cols: Column<Transfer>[] = [
    { key: 'no', header: tc('number'), sort: (x) => x.number, cell: (x) => <span className="font-semibold">{x.number}</span> },
    {
      key: 'route',
      header: t('transfers.route'),
      cell: (x) => (
        <span className="inline-flex items-center gap-2 text-sm">
          {bl(x.fromBranchId)}
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 rtl:rotate-180" />
          {bl(x.toBranchId)}
        </span>
      )
    },
    { key: 'items', header: tc('products'), align: 'end', cell: (x) => <span className="tabular-nums">{t('transfers.itemsUnits', { n: x.items.length, u: x.items.reduce((s, i) => s + i.qty, 0) })}</span> },
    { key: 'date', header: tc('date'), sort: (x) => x.createdAt, cell: (x) => <span className="text-xs text-slate-500">{fmt.date(x.createdAt)}</span> },
    { key: 'st', header: tc('status'), cell: (x) => <StatusBadge status={x.status} /> },
    { key: 'act', header: '', align: 'end', cell: (x) => <TransferActions x={x} onCancel={() => setCancel(x)} /> }
  ];
  return (
    <>
      <PageHeader
        title={t('transfers.title')}
        subtitle={t('transfers.subtitle')}
        icon={ArrowLeftRight}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setOpen(true)}>
            {t('transfers.new')}
          </Button>
        }
      />
      <Card>
        <Toolbar>
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: 'all', label: tc('all'), count: list.length },
              { value: 'pending', label: t('transfers.tabPending'), count: count('pending') },
              { value: 'in_transit', label: t('transfers.tabTransit'), count: count('in_transit') },
              { value: 'received', label: t('transfers.tabReceived'), count: count('received') },
              { value: 'cancelled', label: t('transfers.tabCancelled'), count: count('cancelled') }
            ]}
          />
        </Toolbar>
        <DataTable rows={rows} columns={cols} rowKey={(x) => x._id} onRowClick={(x) => navigate(`/erp/transfers/${x._id}`)} empty={<EmptyState icon={ArrowLeftRight} title={t('transfers.none')} />} />
      </Card>
      {open && <NewTransferModal open={open} onClose={() => setOpen(false)} />}
      <ConfirmDialog open={!!cancel} onClose={() => setCancel(null)} onConfirm={() => cancel && actions.cancel(cancel)} danger title={t('transfers.cancel')} message={t('transfers.cancelConfirm', { no: cancel?.number ?? '' })} />
    </>
  );
}

function TransferDetail() {
  const { id = '' } = useParams();
  const t = useTs();
  const tc = useTranslations('Erp.common');
  const fmt = useFmt();
  const d = useErpState();
  const bl = useBranchLookup();
  const actions = useTransferActions();
  const [cancel, setCancel] = useState(false);
  const x = d.transfers.find((y) => y._id === id);
  if (!x) return <EmptyState title={t('transfers.none')} action={<Link to="/erp/transfers"><Button icon={ArrowLeft}>{t('common.back')}</Button></Link>} />;
  const cols: Column<{ productId: ID; qty: number }>[] = [
    { key: 'p', header: tc('product'), cell: (i) => <ProductCell id={i.productId} /> },
    { key: 'src', header: t('transfers.atSource'), align: 'end', cell: (i) => <span className="tabular-nums text-slate-500">{fmt.int(stockOf(d, i.productId, x.fromBranchId))}</span> },
    { key: 'dst', header: t('transfers.atTarget'), align: 'end', cell: (i) => <span className="tabular-nums text-slate-500">{fmt.int(stockOf(d, i.productId, x.toBranchId))}</span> },
    { key: 'q', header: tc('qty'), align: 'end', cell: (i) => <span className="font-semibold tabular-nums">{fmt.int(i.qty)}</span> }
  ];
  return (
    <>
      <Link to="/erp/transfers" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-dark mb-4">
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
        {t('transfers.title')}
      </Link>
      <PageHeader title={x.number} subtitle={`${bl(x.fromBranchId)} → ${bl(x.toBranchId)}`} icon={ArrowLeftRight} actions={<TransferActions x={x} onCancel={() => setCancel(true)} />} />
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title={tc('products')} />
          <DataTable rows={x.items} columns={cols} rowKey={(i) => i.productId} />
        </Card>
        <Card>
          <CardHeader title={tc('details')} />
          <KeyValue
            cols={1}
            items={[
              { label: tc('status'), value: <StatusBadge status={x.status} /> },
              { label: tc('from'), value: bl(x.fromBranchId) },
              { label: tc('to'), value: bl(x.toBranchId) },
              { label: tc('createdAt'), value: fmt.dateTime(x.createdAt) },
              { label: t('transfers.updated'), value: fmt.dateTime(x.updatedAt) },
              { label: tc('notes'), value: x.notes || '—' }
            ]}
          />
        </Card>
      </div>
      <ConfirmDialog open={cancel} onClose={() => setCancel(false)} onConfirm={() => actions.cancel(x)} danger title={t('transfers.cancel')} message={t('transfers.cancelConfirm', { no: x.number })} />
    </>
  );
}

export default function TransfersPage() {
  return (
    <Routes>
      <Route index element={<TransferList />} />
      <Route path=":id" element={<TransferDetail />} />
    </Routes>
  );
}
