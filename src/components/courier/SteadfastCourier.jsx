import React, { useEffect, useState } from 'react';
import { Loader2, Truck } from 'lucide-react';
import { apiService } from '../../services/api';
import {
  CourierConnectCard,
  CourierModal,
  CourierOrderList,
  CourierPageHeader,
  DetailGrid,
  Field,
  Notice,
  PrimaryButton,
  SelectInput,
  TextArea,
  TextInput,
} from './CourierShared';

const CONNECT_FIELDS = [
  { name: 'api_key', label: 'API key', type: 'password', placeholder: 'Enter your Steadfast API key' },
  { name: 'secret_key', label: 'Secret key', type: 'password', autoComplete: 'new-password', placeholder: 'Enter your Steadfast secret key', secret: true },
];

// Steadfast delivery types: 0 = home delivery, 1 = point (hub) delivery.
const DELIVERY_TYPES = [
  { value: 0, label: 'Home delivery' },
  { value: 1, label: 'Point delivery' },
];

const optionalString = (value) => (value && String(value).trim()) || null;
const optionalInt = (value) => (value === '' || value === null || value === undefined ? null : Number.parseInt(value, 10));

const SteadfastShipModal = ({ order, onClose }) => {
  const [form, setForm] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState('');
  const [placement, setPlacement] = useState(null);

  // The modal is keyed by order id, so this runs once per order.
  useEffect(() => {
    let cancelled = false;
    apiService.getSteadfastOrderPrefill(order.id)
      .then(response => {
        if (!cancelled) {
          const raw = response?.data || response || {};
          const rawTotal = order.total !== undefined && order.total !== null ? Number(String(order.total).trim()) : null;
          const fallbackCod = Number.isFinite(rawTotal) && rawTotal >= 0 && rawTotal < 1e9 ? rawTotal : 0;
          setForm({
            ...raw,
            recipient_name: raw.recipient_name || order.contact_name || '',
            recipient_phone: raw.recipient_phone || order.contact_phone || '',
            recipient_address: raw.recipient_address || order.delivery_address || '',
            cod_amount: raw.cod_amount !== undefined && raw.cod_amount !== '' && raw.cod_amount !== null
              ? raw.cod_amount
              : fallbackCod,
          });
        }
      })
      .catch(err => { if (!cancelled) setLoadError(err.message || 'Could not load the Steadfast order prefill.'); });
    return () => { cancelled = true; };
  }, [order.id]);

  const setField = (field) => (event) => setForm(current => ({ ...current, [field]: event.target.value }));
  const locked = placing || Boolean(placement);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form || placement) return;
    const confirmed = window.confirm(
      `Place order ${form.invoice || order.id} with Steadfast Courier? This will create a real consignment.`
    );
    if (!confirmed) return;

    setPlacing(true);
    setPlaceError('');
    try {
      const response = await apiService.placeSteadfastOrder(order.id, {
        recipient_name: form.recipient_name?.trim() || '',
        recipient_phone: form.recipient_phone?.trim() || '',
        alternative_phone: optionalString(form.alternative_phone),
        recipient_email: optionalString(form.recipient_email),
        recipient_address: form.recipient_address?.trim() || '',
        cod_amount: Number(form.cod_amount) || 0,
        note: optionalString(form.note),
        item_description: optionalString(form.item_description),
        total_lot: optionalInt(form.total_lot),
        delivery_type: optionalInt(form.delivery_type),
      });
      setPlacement(response?.data || response);
    } catch (err) {
      setPlaceError(err.message || 'Could not place the order with Steadfast Courier.');
    } finally {
      setPlacing(false);
    }
  };

  const consignment = placement?.consignment;

  return (
    <CourierModal
      title="Ship with Steadfast"
      subtitle={`${order.contact_name || 'Customer order'} · ${form?.invoice || order.id}`}
      onClose={onClose}
      footer={placement ? (
        <PrimaryButton type="button" onClick={onClose}>Done</PrimaryButton>
      ) : (
        <PrimaryButton type="submit" form="steadfast-ship-form" loading={placing} disabled={!form}>
          {placing ? 'Placing order...' : 'Place order with Steadfast'}
        </PrimaryButton>
      )}
    >
      {loadError ? (
        <Notice>{loadError}</Notice>
      ) : !form ? (
        <div className="flex h-48 flex-col items-center justify-center text-slate-400">
          <Loader2 className="mb-3 animate-spin" size={28} />
          <p>Preparing courier details...</p>
        </div>
      ) : (
        <form id="steadfast-ship-form" onSubmit={handleSubmit} className="space-y-5">
          <p className="text-sm text-slate-500">These values were prepared from the order. Review and edit them before placing the consignment.</p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Recipient" required>
              <TextInput value={form.recipient_name ?? ''} onChange={setField('recipient_name')} disabled={locked} required />
            </Field>
            <Field label="Phone" required>
              <TextInput type="tel" value={form.recipient_phone ?? ''} onChange={setField('recipient_phone')} disabled={locked} required />
            </Field>
            <Field label="Alternative phone">
              <TextInput type="tel" value={form.alternative_phone ?? ''} onChange={setField('alternative_phone')} disabled={locked} />
            </Field>
            <Field label="Email">
              <TextInput type="email" value={form.recipient_email ?? ''} onChange={setField('recipient_email')} disabled={locked} />
            </Field>
            <Field label="COD amount" required hint="Cash to collect on delivery. Use 0 if already paid.">
              <TextInput type="number" min={0} step="any" value={form.cod_amount ?? ''} onChange={setField('cod_amount')} disabled={locked} required />
            </Field>
            <Field label="Delivery type">
              <SelectInput value={form.delivery_type ?? 0} onChange={setField('delivery_type')} disabled={locked}>
                {DELIVERY_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
              </SelectInput>
            </Field>
            <Field label="Total lot">
              <TextInput type="number" min={0} step={1} value={form.total_lot ?? ''} onChange={setField('total_lot')} disabled={locked} />
            </Field>
            <Field label="Address" required className="sm:col-span-2">
              <TextArea value={form.recipient_address ?? ''} onChange={setField('recipient_address')} disabled={locked} required />
            </Field>
            <Field label="Item description" className="sm:col-span-2">
              <TextArea value={form.item_description ?? ''} onChange={setField('item_description')} disabled={locked} />
            </Field>
            <Field label="Note" className="sm:col-span-2">
              <TextArea value={form.note ?? ''} onChange={setField('note')} disabled={locked} />
            </Field>
          </div>

          {placeError && <Notice>{placeError}</Notice>}

          {placement && (
            <div className="space-y-3">
              <Notice tone="success">{placement.message || 'Order placed successfully.'}</Notice>
              {consignment && (
                <DetailGrid items={[
                  ['Tracking code', consignment.tracking_code],
                  ['Consignment ID', consignment.consignment_id],
                  ['Invoice', consignment.invoice],
                  ['Status', consignment.status],
                ]} />
              )}
            </div>
          )}
        </form>
      )}
    </CourierModal>
  );
};

const SteadfastCourier = ({ pages }) => {
  const [shippingOrder, setShippingOrder] = useState(null);

  return (
    <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-slate-50">
      <CourierPageHeader
        icon={Truck}
        title="Steadfast Courier"
        description="Connect your Steadfast account and send captured orders for delivery."
      />

      <div className="flex-1 space-y-6 overflow-y-auto p-6 md:p-8">
        <CourierConnectCard
          courierName="Steadfast"
          fields={CONNECT_FIELDS}
          onConnect={credentials => apiService.connectSteadfast(credentials)}
          webhookHelp="Add these values to the webhook settings in your Steadfast merchant panel to receive delivery updates."
        />
        <CourierOrderList pages={pages} courierName="Steadfast" onShip={setShippingOrder} />
      </div>

      {shippingOrder && (
        <SteadfastShipModal key={shippingOrder.id} order={shippingOrder} onClose={() => setShippingOrder(null)} />
      )}
    </div>
  );
};

export default SteadfastCourier;
