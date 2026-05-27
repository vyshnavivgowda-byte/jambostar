"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Wallet,
  CreditCard,
  Eye,
  Search,
  BadgeIndianRupee,
  CalendarDays,
  Clock3,
  User2,
  Package2,
  AlertCircle,
  Truck,
  Building2,
  Phone,
  MapPin,
} from "lucide-react";

import toast, { Toaster } from "react-hot-toast";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchPayments();
  }, []);

  // ================= FETCH PAYMENTS =================
  const fetchPayments = async () => {
    setLoading(true);

    try {
      // ================= PAYMENTS =================
      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });

      if (paymentError) throw paymentError;

      const payments = paymentData || [];

      // ================= ORDER IDS =================
      const orderIds = [
        ...new Set(
          payments.map((p: any) => p.order_id).filter(Boolean)
        ),
      ];

      let ordersMap: any = {};

      // ================= FETCH ORDERS =================
      if (orderIds.length > 0) {
        const { data: ordersData, error: ordersError } = await supabase
          .from("orders")
          .select(`
            id,
            order_id_custom,
            total_amount,
            order_status,
            payment_status,
            delivery_person_id,
            user_id
          `)
          .in("id", orderIds);

        if (ordersError) {
          console.error("ORDERS ERROR:", ordersError);
        }

        // ================= DELIVERY IDS =================
        const deliveryIds = [
          ...new Set(
            (ordersData || [])
              .map((o: any) => o.delivery_person_id)
              .filter(Boolean)
          ),
        ];

        // ================= USER IDS =================
        const userIds = [
          ...new Set(
            (ordersData || [])
              .map((o: any) => o.user_id)
              .filter(Boolean)
          ),
        ];

        // ================= FETCH RIDERS =================
        let ridersMap: any = {};

        if (deliveryIds.length > 0) {
          const { data: ridersData } = await supabase
            .from("delivery_persons")
            .select(`
              id,
              name,
              phone_number,
              vehicle_number
            `)
            .in("id", deliveryIds);

          ridersMap = (ridersData || []).reduce(
            (acc: any, curr: any) => {
              acc[curr.id] = curr;
              return acc;
            },
            {}
          );
        }

        // ================= FETCH CUSTOMERS =================
        let usersMap: any = {};

        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from("wholesale_users")
            .select(`
              id,
              company_name,
              owner_name,
              phone,
              shop_address,
              business_id
            `)
            .in("id", userIds);

          usersMap = (usersData || []).reduce(
            (acc: any, curr: any) => {
              acc[curr.id] = curr;
              return acc;
            },
            {}
          );
        }

        // ================= FINAL MAP =================
        ordersMap = (ordersData || []).reduce(
          (acc: any, curr: any) => {
            acc[curr.id] = {
              ...curr,
              delivery_person:
                ridersMap[curr.delivery_person_id] || null,

              customer:
                usersMap[curr.user_id] || null,
            };

            return acc;
          },
          {}
        );
      }

      // ================= MERGE =================
      const mergedPayments = payments.map((payment: any) => ({
        ...payment,
        order_details: ordersMap[payment.order_id] || null,
      }));

      setPayments(mergedPayments);

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  // ================= UPDATE PAYMENT =================
  const updatePaymentStatus = async (
    paymentId: string,
    orderId: string,
    status: string
  ) => {
    setUpdatingId(paymentId);

    try {
      // UPDATE PAYMENT
      const { error: paymentError } = await supabase
        .from("payments")
        .update({
          payment_status: status,
          verified_at: new Date().toISOString(),
        })
        .eq("id", paymentId);

      if (paymentError) throw paymentError;

      // UPDATE ORDER
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          payment_status:
            status === "approved"
              ? "paid"
              : status === "rejected"
              ? "payment_rejected"
              : "pending",
        })
        .eq("id", orderId);

      if (orderError) throw orderError;

      toast.success(`Payment ${status}`);
      fetchPayments();

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  // ================= FILTER =================
  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {

      const matchesFilter =
        activeFilter === "all"
          ? true
          : payment.payment_status === activeFilter;

      const searchText = search.toLowerCase();

      const matchesSearch =
        payment.order_id_custom?.toLowerCase()?.includes(searchText) ||
        payment.order_details?.customer?.company_name
          ?.toLowerCase()
          ?.includes(searchText) ||
        payment.payment_method?.toLowerCase()?.includes(searchText) ||
        payment.utr_number?.toLowerCase()?.includes(searchText);

      return matchesFilter && matchesSearch;
    });
  }, [payments, activeFilter, search]);

  // ================= TOTALS =================
  const totalCollection = payments.reduce(
    (acc, curr) => acc + Number(curr.payment_amount || 0),
    0
  );

  const approvedTotal = payments
    .filter((p) => p.payment_status === "approved")
    .reduce((acc, curr) => acc + Number(curr.payment_amount || 0), 0);

  const pendingTotal = payments
    .filter((p) => p.payment_status === "pending")
    .reduce((acc, curr) => acc + Number(curr.payment_amount || 0), 0);

  // ================= LOADING =================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-slate-900" size={45} />

          <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
            Loading Payments
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Toaster position="top-center" />

      {/* HEADER */}
      <div className="bg-slate-900 px-6 pt-12 pb-24 rounded-b-[3.5rem] shadow-2xl">

        <div className="max-w-7xl mx-auto">

          <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
            Delivery Payment Management
          </p>

          <h1 className="text-4xl md:text-5xl font-black text-white mt-3">
            Payment Records
          </h1>

          <p className="text-sm text-slate-400 font-bold mt-3 uppercase tracking-wide">
            COD • UPI • Verification • Proof Management
          </p>

          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">

            <div className="bg-white/10 backdrop-blur-md rounded-[2rem] p-6 border border-white/10">
              <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">
                Total Collection
              </p>

              <h2 className="text-3xl font-black text-white">
                ₹{totalCollection.toFixed(2)}
              </h2>
            </div>

            <div className="bg-green-500/10 backdrop-blur-md rounded-[2rem] p-6 border border-green-500/20">
              <p className="text-[10px] uppercase font-black tracking-widest text-green-300 mb-2">
                Approved Payments
              </p>

              <h2 className="text-3xl font-black text-green-400">
                ₹{approvedTotal.toFixed(2)}
              </h2>
            </div>

            <div className="bg-orange-500/10 backdrop-blur-md rounded-[2rem] p-6 border border-orange-500/20">
              <p className="text-[10px] uppercase font-black tracking-widest text-orange-300 mb-2">
                Pending Verification
              </p>

              <h2 className="text-3xl font-black text-orange-400">
                ₹{pendingTotal.toFixed(2)}
              </h2>
            </div>

          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="max-w-7xl mx-auto px-6 -mt-14">

        {/* SEARCH + FILTER */}
        <div className="bg-white rounded-[2.5rem] p-5 shadow-2xl border border-slate-100 mb-8">

          <div className="flex flex-col md:flex-row gap-4">

            {/* SEARCH */}
            <div className="flex-1 relative">

              <Search
                className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />

              <input
                type="text"
                placeholder="Search order, customer, UTR..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-14 pr-5 py-5 rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:border-slate-900 text-sm font-bold"
              />
            </div>

            {/* FILTER */}
            <div className="flex gap-2">

              {["all", "approved", "pending", "rejected"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-5 py-4 rounded-2xl text-xs font-black uppercase transition-all
                  ${
                    activeFilter === filter
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* EMPTY */}
        {filteredPayments.length === 0 ? (
          <div className="bg-white rounded-[3rem] p-16 border border-slate-200 text-center">

            <Wallet
              size={60}
              className="mx-auto text-slate-300 mb-5"
            />

            <h2 className="text-2xl font-black text-slate-800 uppercase">
              No Payments Found
            </h2>

          </div>
        ) : (
          <div className="space-y-6">

            {filteredPayments.map((payment) => (

              <div
                key={payment.id}
                className="bg-white rounded-[3rem] p-7 shadow-xl border border-slate-100"
              >

                {/* TOP */}
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5 mb-7">

                  <div>

                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">
                      Order Information
                    </p>

                    <h2 className="text-2xl font-black text-slate-900">
                      #{payment.order_id_custom}
                    </h2>

                    <div className="flex items-center gap-2 mt-2">
                      <User2 size={15} className="text-slate-400" />

                      <p className="text-sm font-bold text-slate-500 uppercase">
                        {payment.order_details?.customer?.company_name || "Customer"}
                      </p>
                    </div>
                  </div>

                  {/* STATUS */}
                  <div
                    className={`px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest w-fit
                    ${
                      payment.payment_status === "approved"
                        ? "bg-green-100 text-green-700"
                        : payment.payment_status === "pending"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-red-100 text-red-700"
                    }
                    `}
                  >
                    {payment.payment_status}
                  </div>
                </div>

                {/* GRID */}
                <div className="grid md:grid-cols-4 gap-4 mb-7">

                  {/* METHOD */}
                  <div className="bg-slate-50 rounded-[2rem] p-5">

                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                      Payment Method
                    </p>

                    <div className="flex items-center gap-3">

                      {payment.payment_method === "cash" ? (
                        <Wallet size={22} className="text-green-600" />
                      ) : (
                        <CreditCard size={22} className="text-blue-600" />
                      )}

                      <span className="text-sm font-black uppercase">
                        {payment.payment_method === "cash"
                          ? "COD"
                          : "UPI"}
                      </span>
                    </div>
                  </div>

                  {/* AMOUNT */}
                  <div className="bg-slate-50 rounded-[2rem] p-5">

                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                      Amount Collected
                    </p>

                    <div className="flex items-center gap-2">
                      <BadgeIndianRupee size={22} />

                      <h2 className="text-2xl font-black text-slate-900">
                        ₹{payment.payment_amount}
                      </h2>
                    </div>
                  </div>

                  {/* UTR */}
                  <div className="bg-slate-50 rounded-[2rem] p-5">

                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                      UTR / Ref Number
                    </p>

                    <p className="text-sm font-black text-slate-700 break-all">
                      {payment.utr_number ||
                        payment.bank_ref_number ||
                        "N/A"}
                    </p>
                  </div>

                  {/* DATE */}
                  <div className="bg-slate-50 rounded-[2rem] p-5">

                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                      Payment Date
                    </p>

                    <p className="text-sm font-black text-slate-700">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </p>

                    <p className="text-xs font-bold text-slate-400 mt-1">
                      {new Date(payment.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {/* ORDER DETAILS */}
                <div className="bg-slate-50 rounded-[2rem] p-5 mb-7">

                  <div className="flex items-center gap-2 mb-4">
                    <Package2 size={18} />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                      Order Details
                    </p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">

                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">
                        Order Number
                      </p>

                      <p className="text-sm font-black text-slate-800">
                        #{payment.order_details?.order_id_custom || "N/A"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">
                        Customer
                      </p>

                      <p className="text-sm font-black text-slate-800">
                        {payment.order_details?.customer?.company_name || "N/A"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">
                        Order Status
                      </p>

                      <p className="text-sm font-black uppercase text-slate-800">
                        {payment.order_details?.order_status || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* CUSTOMER + DELIVERY DETAILS */}
                <div className="grid md:grid-cols-2 gap-5 mb-7">

                  {/* CUSTOMER */}
                  <div className="bg-slate-50 rounded-[2rem] p-5 border border-slate-200">

                    <div className="flex items-center gap-2 mb-4">
                      <Building2 size={18} />
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                        Customer Details
                      </p>
                    </div>

                    <div className="space-y-4">

                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-1">
                          Company Name
                        </p>

                        <p className="text-sm font-black text-slate-800">
                          {payment.order_details?.customer?.company_name || "N/A"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-1">
                          Owner Name
                        </p>

                        <p className="text-sm font-black text-slate-800">
                          {payment.order_details?.customer?.owner_name || "N/A"}
                        </p>
                      </div>

                      <div className="flex items-start gap-2">
                        <Phone size={16} className="mt-1 text-slate-400" />

                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400 mb-1">
                            Phone Number
                          </p>

                          <p className="text-sm font-black text-slate-800">
                            {payment.order_details?.customer?.phone || "N/A"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <MapPin size={16} className="mt-1 text-slate-400" />

                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400 mb-1">
                            Shop Address
                          </p>

                          <p className="text-sm font-black text-slate-800">
                            {payment.order_details?.customer?.shop_address || "N/A"}
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* DELIVERY PERSON */}
                  <div className="bg-slate-50 rounded-[2rem] p-5 border border-slate-200">

                    <div className="flex items-center gap-2 mb-4">
                      <Truck size={18} />

                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                        Delivery Rider
                      </p>
                    </div>

                    <div className="space-y-4">

                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-1">
                          Rider Name
                        </p>

                        <p className="text-sm font-black text-slate-800">
                          {payment.order_details?.delivery_person?.name || "N/A"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-1">
                          Phone Number
                        </p>

                        <p className="text-sm font-black text-slate-800">
                          {payment.order_details?.delivery_person?.phone_number || "N/A"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-1">
                          Vehicle Number
                        </p>

                        <p className="text-sm font-black text-slate-800">
                          {payment.order_details?.delivery_person?.vehicle_number || "N/A"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-1">
                          Collection Type
                        </p>

                        <div
                          className={`inline-flex px-3 py-2 rounded-full text-[10px] font-black uppercase
                          ${
                            payment.payment_method === "cash"
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                          }
                          `}
                        >
                          {payment.payment_method === "cash"
                            ? "COD Collection"
                            : "UPI Transfer"}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

                {/* PAYMENT PROOF */}
                {payment.payment_screenshot && (
                  <div className="mb-7">

                    <div className="flex items-center gap-2 mb-4">
                      <Eye size={18} />

                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                        Payment Screenshot
                      </p>
                    </div>

                    <div
                      onClick={() =>
                        setPreviewImage(payment.payment_screenshot)
                      }
                      className="w-44 h-44 rounded-[2rem] overflow-hidden border border-slate-200 cursor-pointer bg-slate-100"
                    >
                      <img
                        src={payment.payment_screenshot}
                        alt="payment proof"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* APPROVE / REJECT */}
                {payment.payment_method === "upi" &&
                  payment.payment_status === "pending" && (

                    <div className="grid md:grid-cols-2 gap-4">

                      {/* APPROVE */}
                      <button
                        disabled={updatingId === payment.id}
                        onClick={() =>
                          updatePaymentStatus(
                            payment.id,
                            payment.order_id,
                            "approved"
                          )
                        }
                        className="bg-green-600 hover:bg-green-700 text-white py-5 rounded-[2rem] font-black uppercase text-sm flex items-center justify-center gap-3"
                      >
                        {updatingId === payment.id ? (
                          <Loader2 className="animate-spin" size={20} />
                        ) : (
                          <>
                            <CheckCircle2 size={20} />
                            Approve Payment
                          </>
                        )}
                      </button>

                      {/* REJECT */}
                      <button
                        disabled={updatingId === payment.id}
                        onClick={() =>
                          updatePaymentStatus(
                            payment.id,
                            payment.order_id,
                            "rejected"
                          )
                        }
                        className="bg-red-600 hover:bg-red-700 text-white py-5 rounded-[2rem] font-black uppercase text-sm flex items-center justify-center gap-3"
                      >
                        <XCircle size={20} />
                        Reject Payment
                      </button>
                    </div>
                  )}

                {/* COD */}
                {payment.payment_method === "cash" && (
                  <div className="bg-green-50 border border-green-200 rounded-[2rem] p-5 flex items-start gap-3">

                    <CheckCircle2
                      className="text-green-600 mt-0.5"
                      size={22}
                    />

                    <div>
                      <p className="text-sm font-black text-green-700 uppercase">
                        Cash On Delivery
                      </p>

                      <p className="text-xs font-bold text-green-600 mt-1">
                        This payment was collected as cash by the delivery rider.
                      </p>
                    </div>
                  </div>
                )}

                {/* REJECTED */}
                {payment.payment_status === "rejected" && (
                  <div className="bg-red-50 border border-red-200 rounded-[2rem] p-5 flex items-start gap-3 mt-5">

                    <AlertCircle
                      className="text-red-600 mt-0.5"
                      size={22}
                    />

                    <div>
                      <p className="text-sm font-black text-red-700 uppercase">
                        Payment Rejected
                      </p>

                      <p className="text-xs font-bold text-red-600 mt-1">
                        This payment was rejected by admin verification.
                      </p>
                    </div>
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
      </div>

      {/* IMAGE PREVIEW */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-5 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="payment proof"
            className="max-w-full max-h-[90vh] rounded-[2rem] shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}