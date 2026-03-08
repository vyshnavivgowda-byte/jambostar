"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    Search, Package, Building2, MapPin, Calendar,
    RefreshCcw, ChevronRight, Filter, History, ShoppingBag
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";


export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [groupedClients, setGroupedClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [updating, setUpdating] = useState(false);

    useEffect(() => { fetchOrders(); }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const { data: ordersData, error: oError } = await supabase
                .from("orders").select('*').order("created_at", { ascending: false });
            if (oError) throw oError;

            const { data: usersData, error: uError } = await supabase
                .from("wholesale_users")
.select('id, email, business_id, company_name, first_name, last_name, phone, shop_address, registered_address, gst_number')
            if (uError) throw uError;

            // Combine data
            const { data: addressesData, error: aError } = await supabase
                .from("addresses")
                .select("*");
            if (aError) throw aError;

            // Combine orders with users and addresses
            const combined = ordersData.map(order => ({
                ...order,
                wholesale_users: usersData.find(u => u.id === order.user_id) || null,
                address: addressesData.find(a => a.id === order.address_id) || null
            }));
            setOrders(combined);

            // Group by Business ID
            const groups = combined.reduce((acc: any, order) => {
                const bId = order.wholesale_users?.business_id || 'Unknown';
                if (!acc[bId]) {
                    acc[bId] = {
                        business_id: bId,
                        company_name: order.wholesale_users?.company_name || "Unknown Business",
                        client_info: order.wholesale_users,
                        all_orders: [],
                        total_spent: 0
                    };
                }
                acc[bId].all_orders.push(order);
                acc[bId].total_spent += (order.total_amount || 0);
                return acc;
            }, {});

            setGroupedClients(Object.values(groups));
        } catch (error: any) {
            toast.error("Failed to load data");
        } finally { setLoading(false); }
    };

const updateStatus = async (orderId: string, updates: any) => {
  try {
    setUpdating(true);

    // Find order
    const order = orders.find((o) => o.id === orderId);

    if (!order) {
      toast.error("Order not found");
      return;
    }

    // Update order in Supabase
    const { error } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", orderId);

    if (error) throw error;

    toast.success("Status Updated");

    // Send email only if customer email exists
    const customerEmail = order?.wholesale_users?.email;

    if (customerEmail) {
      try {
await fetch("/api/send-order-email", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: customerEmail,
    orderId: order.order_id_custom,
    status: updates.order_status || updates.payment_status,
    items: order.items,
    total: order.total_payable_amount,
    paid: order.amount_paid_now,
    remaining: order.remaining_balance,
    address: order.address_snapshot,
  }),
});
      } catch (emailError) {
        console.error("Email send failed:", emailError);
      }
    }

    // Refresh orders
    await fetchOrders();

  } catch (err) {
    console.error(err);
    toast.error("Update Failed");
  } finally {
    setUpdating(false);
  }
};

    const generateCombinedPDF = () => {
        if (!selectedClient) return;

        const doc = new jsPDF('l', 'mm', 'a4');

        // --- HEADER ---
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("Combined Active Orders Invoice", 14, 20);

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Business: ${selectedClient.company_name}`, 14, 30);
        doc.text(`Business ID: ${selectedClient.business_id}`, 14, 36);
        doc.text(`Phone: ${selectedClient.client_info?.phone || 'N/A'}`, 14, 42);

        // --- ADDRESS SECTION ---
        const shopAddr = selectedClient.client_info?.shop_address || '-';
        const regAddr = selectedClient.client_info?.registered_address || '-';

        const shopAddressLines = doc.splitTextToSize(shopAddr, 160);
        doc.setFont("helvetica", "bold");
        doc.text("Shop Address:", 14, 48);
        doc.setFont("helvetica", "normal");
        doc.text(shopAddressLines, 55, 48);

        const registeredAddressY = 48 + (shopAddressLines.length * 6);
        const regAddressLines = doc.splitTextToSize(regAddr, 160);
        doc.setFont("helvetica", "bold");
        doc.text("Registered Address:", 14, registeredAddressY);
        doc.setFont("helvetica", "normal");
        doc.text(regAddressLines, 55, registeredAddressY);

        // --- TABLE CALCULATIONS ---
        const activeOrders = selectedClient.all_orders.filter(
            (order: any) => order.order_status !== 'delivered' && order.order_status !== 'cancelled'
        );

        let totalRemainingBalance = 0;

        const columns = [
            "Order ID",
            "Date",
            "Delivery Address",
            "Product Name",
            "Qty",
            "Price",
            "Total",
            "Paid",
            "Remaining"
        ];

        const rows: any[] = [];
activeOrders.forEach((order: any) => {          
      const deliveryAddress = order.address_snapshot || "N/A";
            // Calculate the running total of remaining balance
            totalRemainingBalance += Number(order.remaining_balance || 0);

            order.items?.forEach((item: any) => {
                const unitPrice = item.price_at_purchase || 0;

                rows.push([
                    order.order_id_custom,
                    new Date(order.created_at).toLocaleDateString(),
                    deliveryAddress,
                    item.product_name,
                    item.quantity,
                    `${Number(unitPrice).toFixed(2)}`,
                    `${Number(order.total_payable_amount).toFixed(2)}`,
                    `${Number(order.amount_paid_now).toFixed(2)}`,
                    `${Number(order.remaining_balance).toFixed(2)}`
                ]);
            });
        });

        const tableStartY = registeredAddressY + (regAddressLines.length * 6) + 10;

        autoTable(doc, {
            startY: tableStartY,
            head: [columns],
            body: rows,
            theme: "grid",
            headStyles: { fillColor: [200, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 30 },
                2: { cellWidth: 45 },
                3: { cellWidth: 40 },
            }
        });

        // --- FINAL REMAINING BALANCE (BIG WORDS) ---
        const finalY = (doc as any).lastAutoTable.finalY + 15;

        doc.setFontSize(16); // Bigger font
        doc.setFont("helvetica", "bold");
        doc.setTextColor(200, 0, 0); // Red color to make it stand out
        doc.text(
            `TOTAL REMAINING AMOUNT TO PAY: RS. ${totalRemainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            14,
            finalY
        );

        doc.save(`Combined_Invoice_${selectedClient.business_id}.pdf`);
    };

    const getStatusStyle = (status: string) => {
        const s = status?.toLowerCase();
        if (['paid', 'fully_paid', 'delivered'].includes(s)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (['processing', 'shipped', 'partially_paid'].includes(s)) return 'bg-amber-50 text-amber-700 border-amber-200';
        return 'bg-slate-50 text-slate-700 border-slate-200';
    };

    const filteredClients = groupedClients.filter(c =>
        c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.business_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#FDF8F8] p-4 md:p-10">
            <Toaster position="top-right" />

            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-[900] text-slate-900 tracking-tight uppercase">Client Registry</h1>
                    <p className="text-black font-medium">Manage orders by business entity</p>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text" placeholder="Search Business ID or Name..."
                        className="w-full pl-12 pr-4 py-4 text-black bg-white border-0 shadow-sm rounded-2xl focus:ring-2 ring-red-500 transition-all outline-none text-sm font-bold"
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Business Table */}
            <div className="max-w-7xl mx-auto bg-white rounded-[2.5rem] shadow-sm border border-red-50 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-red-50/50 border-b border-red-100">
                        <tr>
                            <th className="px-8 py-5 text-[11px] font-black uppercase text-red-400">Business Entity</th>
                            <th className="px-8 py-5 text-[11px] font-black uppercase text-red-400">Order Volume</th>
                            <th className="px-8 py-5 text-[11px] font-black uppercase text-red-400">Total Revenue</th>
                            <th className="px-8 py-5 text-[11px] font-black uppercase text-red-400">Balance Due</th>
                            <th className="px-8 py-5 text-[11px] font-black uppercase text-red-400 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-red-50">
                        {filteredClients.map(client => (
                            <tr key={client.business_id} className="hover:bg-red-50/30 transition-all cursor-pointer group" onClick={() => setSelectedClient(client)}>
                                <td className="px-8 py-6">
                                    <div className="text-lg font-black text-slate-900 tracking-tighter uppercase">{client.company_name}</div>
                                    <div className="text-[10px] font-bold text-red-600 uppercase tracking-widest">{client.business_id}</div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-2">
                                        <ShoppingBag size={16} className="text-slate-400" />
                                        <span className="font-black text-slate-700">{client.all_orders.length} Orders</span>
                                    </div>
                                </td>

                                <td className="px-8 py-6">
                                    <div className="text-sm font-black text-slate-900">₹{client.total_spent?.toLocaleString()}</div>
                                </td>
                                <td className="px-8 py-6">
                                    {/* Calculate total remaining across all active orders for this client */}
                                    <div className="text-sm font-black text-red-600">
                                    client.all_orders.reduce((acc: number, o: any) => acc + (Number(o.remaining_balance) || 0), 0)
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <button className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-red-600 transition-all">
                                        View History
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Slide-over Detail View: ALL ORDERS FOR BUSINESS */}
            {selectedClient && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end">
                    <div className="w-full max-w-4xl bg-white h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-500">
                        <div className="p-10">
                            <button onClick={() => setSelectedClient(null)} className="mb-6 px-4 py-2 bg-slate-100 rounded-lg text-xs font-black uppercase text-slate-500 hover:bg-red-600 hover:text-white transition-all">
                                ← Back to Registry
                            </button>

                            <div className="mb-10 border-b border-red-50 pb-10">
                                <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase mb-2">{selectedClient.company_name}</h2>
                                <p className="text-red-500 font-black text-sm tracking-widest uppercase">{selectedClient.business_id} • {selectedClient.client_info?.phone}</p>
                            </div>

                            {/* Section: ACTIVE / PENDING ORDERS */}
                            <div className="mb-12">
                                <h3 className="text-xs font-black text-slate-400 uppercase mb-6 flex items-center gap-2">
                                    <RefreshCcw size={16} className="text-amber-500" /> Active Shipments & Processing
                                </h3>

                                <button
                                    onClick={generateCombinedPDF}
                                    className="mb-4 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase hover:bg-red-700 transition"
                                >
                                    Download All Active Orders
                                </button>
                                <div className="space-y-4">
                                    {selectedClient.all_orders.filter((o: any) => o.order_status !== 'delivered' && o.order_status !== 'cancelled').map((order: any) => (
                                        <OrderCard key={order.id} order={order} updateStatus={updateStatus} getStatusStyle={getStatusStyle} updating={updating} />
                                    ))}
                                </div>
                            </div>

                            {/* Section: COMPLETED ORDERS */}
                            <div>
                                <h3 className="text-xs font-black text-slate-400 uppercase mb-6 flex items-center gap-2">
                                    <History size={16} className="text-emerald-500" /> Past Deliveries
                                </h3>
                                <div className="space-y-4 opacity-80">
                                    {selectedClient.all_orders.filter((o: any) => o.order_status === 'delivered').map((order: any) => (
                                        <OrderCard key={order.id} order={order} updateStatus={updateStatus} getStatusStyle={getStatusStyle} updating={updating} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Sub-component for individual orders within the client view
function OrderCard({ order, updateStatus, getStatusStyle, updating }: any) {
    const generateInvoicePDF = (order: any) => {
        const doc = new jsPDF();

        // --- HEADER ---
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text("INVOICE", 14, 20);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Invoice Created: ${new Date().toLocaleDateString()}`, 14, 28);

        // --- BUSINESS INFO ---
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Business Details:", 14, 38);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Company: ${order.wholesale_users?.company_name || 'Unknown'}`, 14, 44);
        doc.text(`GST Number: ${order.wholesale_users?.gst_number || '-'}`, 14, 50);

        // Shop Address with multiline support
        const shopAddr = order.wholesale_users?.shop_address || '-';
        const shopAddressLines = doc.splitTextToSize(shopAddr, 140);
        doc.text("Shop Address:", 14, 56);
        doc.text(shopAddressLines, 45, 56);

        const registeredAddressY = 56 + (shopAddressLines.length * 5);
        doc.text(`Registered Address: ${order.wholesale_users?.registered_address || '-'}`, 14, registeredAddressY);

        // --- ORDER INFO ---
        const orderDetailsY = registeredAddressY + 10;
        doc.setFont("helvetica", "bold");
        doc.text("Order Details:", 14, orderDetailsY);
        doc.setFont("helvetica", "normal");
        doc.text(`Order ID: ${order.order_id_custom}`, 14, orderDetailsY + 6);
        doc.text(`Order Placed: ${new Date(order.created_at).toLocaleDateString()}`, 14, orderDetailsY + 12);

        // --- DELIVERY ADDRESS ---
        doc.setFont("helvetica", "bold");
        doc.text("Delivery Address:", 14, orderDetailsY + 22);
        doc.setFont("helvetica", "normal");

        // Using address_snapshot as requested for the delivery location
        const deliveryAddr = order.address_snapshot || "-";
        const deliveryLines = doc.splitTextToSize(deliveryAddr, 150);
        doc.text(deliveryLines, 14, orderDetailsY + 28);

        // --- ITEMS TABLE ---
        const columns = ["Product Name", "Quantity", "Price", "Total"];
        const rows = order.items?.map((item: any) => {
            // FIX: Using price_at_purchase to ensure price is fetched correctly
            const price = item.price_at_purchase || 0;
            const subtotal = (item.quantity * price);
            return [
                item.product_name,
                item.quantity,
                `RS. ${Number(price).toFixed(2)}`,
                `RS. ${Number(subtotal).toFixed(2)}`
            ];
        }) || [];

        autoTable(doc, {
            startY: orderDetailsY + 28 + (deliveryLines.length * 5) + 5,
            head: [columns],
            body: rows,
            theme: "grid",
            headStyles: { fillColor: [200, 0, 0], textColor: [255, 255, 255] }, // Red theme
            styles: { fontSize: 9 },
        });

        // --- PAYMENT SUMMARY ---
        const lastY = (doc as any).lastAutoTable?.finalY || 150;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Payment Summary:", 14, lastY + 10);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Total Payable: RS. ${Number(order.total_payable_amount || 0).toFixed(2)}`, 14, lastY + 18);
        doc.text(`Amount Paid Now: RS. ${Number(order.amount_paid_now || 0).toFixed(2)}`, 14, lastY + 24);
        doc.text(`Payment Type: ${order.payment_type || '-'}`, 14, lastY + 30);

        // --- BIG REMAINING BALANCE WORD ---
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(200, 0, 0); // Bold Red
        const remaining = Number(order.remaining_balance || 0).toFixed(2);
        doc.text(`REMAINING BALANCE TO PAY: RS. ${remaining}`, 14, lastY + 45);

        // --- SAVE PDF ---
        doc.save(`invoice_${order.order_id_custom}.pdf`);
    };

    return (
        <div className="border-2 border-red-50 rounded-3xl p-6 hover:border-red-200 transition-all">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <span className="text-lg font-black text-slate-900">{order.order_id_custom}</span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2 items-center">
                    <select
                        className={`p-2 rounded-xl border text-[10px] font-black uppercase ${getStatusStyle(order.order_status)}`}
                        value={order.order_status}
                        onChange={(e) => updateStatus(order.id, { order_status: e.target.value })}
                        disabled={updating || order.order_status === "delivered" || order.order_status === "cancelled"}
                    >
                        <option value="processing">Conformed</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                    </select>

                    <select
                        className={`p-2 rounded-xl border text-[10px] font-black uppercase ${getStatusStyle(order.payment_status)}`}
                        value={order.payment_status}
                        onChange={(e) => updateStatus(order.id, { payment_status: e.target.value })}
                        disabled={updating || order.payment_status === "paid"}
                    >
                        <option value="pending">Unpaid</option>
                        <option value="paid">Paid</option>
                    </select>

                    {/* Download Invoice Button */}
                    <button
                        onClick={() => generateInvoicePDF(order)}
                        className="ml-4 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase hover:bg-red-700 transition"
                        type="button"
                    >
                        Download Invoice
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl">
                <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Items</p>
                    <div className="text-xs font-bold text-slate-700">
                        {order.items?.map((i: any, index: number) => (
                            <div key={index}>
                                {i.quantity}x {i.product_name}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Amount</p>
                    <div className="text-lg font-black text-red-600">₹{order.total_amount?.toLocaleString()}</div>
                </div>
            </div>
        </div>
    );
}