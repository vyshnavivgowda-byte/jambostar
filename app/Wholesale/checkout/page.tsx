"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
    MapPin, Loader2, ShieldCheck, Package, Building2, Store,
    Wallet, CheckCircle2, Info, ArrowLeft, Plus, AlertTriangle, ChevronRight,
    Banknote, Smartphone, Camera, Upload, FileText, X, CreditCard
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function CheckoutPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [payLoading, setPayLoading] = useState(false);
    const [transportCharge, setTransportCharge] = useState(0);
    const [platformCharge, setPlatformCharge] = useState(80);
    const [handlingCharge, setHandlingCharge] = useState(150);
    const [showPaymentPopup, setShowPaymentPopup] = useState(false);

    // Data States
    const [cartItems, setCartItems] = useState<any[]>([]);
    const [dbAddresses, setDbAddresses] = useState<any[]>([]);
    const [profileAddresses, setProfileAddresses] = useState<any[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>('reg');
    const [selectedAddressText, setSelectedAddressText] = useState<string>("");
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [bankDetails, setBankDetails] = useState<any>(null);

    // Form State
    const [formData, setFormData] = useState({
        full_name: "", phone: "", street_address: "", city: "", state: "", pincode: ""
    });

    // Payment Logic
    const [totalWithGst, setTotalWithGst] = useState(0);
    const [subtotal, setSubtotal] = useState(0);
    const [advanceAmount, setAdvanceAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<'bank' | 'upi'>('bank');
    const [transactionDetails, setTransactionDetails] = useState({
        transactionId: "",
        utrNumber: "",
        amountPaid: "",
        photo: null as File | null
    });
    const [showPaymentProof, setShowPaymentProof] = useState(false);
    const minPercent = 0.15;

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const userStr = localStorage.getItem("wholesale_user");
            if (!userStr) return router.push("/");

            const user = JSON.parse(userStr);

            // 1️⃣ LOAD BANK DETAILS (Admin)
            const { data: bankData } = await supabase
                .from("bank_details")
                .select("*")
                .single();
            setBankDetails(bankData);

            // 2️⃣ LOAD PROFILE FIRST
            const { data: profile } = await supabase
                .from("wholesale_users")
                .select("*")
                .eq("id", user.id)
                .single();

            const transport = profile?.transport_charge || 0;
            setTransportCharge(transport);

            if (profile) {
                setProfileAddresses([
                    {
                        id: "reg",
                        type: "Registered Office",
                        addr: profile.registered_address,
                        icon: <Building2 size={16} />,
                    },
                    {
                        id: "shop",
                        type: "Shop/Warehouse",
                        addr: profile.shop_address,
                        icon: <Store size={16} />,
                    },
                ]);
                setSelectedAddressText(profile.registered_address);
            }

            // 3️⃣ LOAD CART
            const { data: cart } = await supabase
                .from("cart")
                .select(`
                    id,
                    quantity,
                    product_variants(
                        id,
                        variant,
                        unit,
                        wholesale_price,
                        products(
                            name,
                            brand,
                            product_images(image_url)
                        )
                    )
                `)
                .eq("user_id", user.id);

            if (!cart || cart.length === 0) {
                router.push("/Wholesale/cart");
                return;
            }

            setCartItems(cart);

            // 4️⃣ CALCULATE TOTALS
            const calcSubtotal = cart.reduce(
                (acc: number, item: any) =>
                    acc + item.quantity * item.product_variants.wholesale_price,
                0
            );

            const gst = calcSubtotal * 0.18;
            const grandTotal =
                calcSubtotal +
                gst +
                transport +
                platformCharge +
                handlingCharge;

            setSubtotal(calcSubtotal);
            setTotalWithGst(grandTotal);
            setAdvanceAmount(Math.ceil(grandTotal * minPercent));

            // 5️⃣ LOAD EXTRA ADDRESSES
            const { data: addr } = await supabase
                .from("addresses")
                .select("*")
                .eq("user_id", user.id);

            setDbAddresses(addr || []);

        } catch (error) {
            console.error("Checkout load error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdvanceChange = (val: number) => {
        if (val > totalWithGst) {
            setAdvanceAmount(Math.floor(totalWithGst));
            toast.error("Cannot exceed total amount");
        } else {
            setAdvanceAmount(val);
        }
    };

    const minRequired = Math.ceil(totalWithGst * minPercent);
    const isAmountTooLow = advanceAmount < minRequired;
    const remainingBalance = totalWithGst - advanceAmount;

    const handlePaymentProofSubmit = async () => {

    if (
        (paymentMethod === "bank" && !transactionDetails.transactionId) ||
        (paymentMethod === "upi" && !transactionDetails.utrNumber)
    ) {
        toast.error("Please enter transaction details");
        return;
    }

    try {

        setPayLoading(true);

        const userStr = localStorage.getItem("wholesale_user");
        const user = JSON.parse(userStr || "{}");

        // Generate Custom Order ID
        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;

        const { count } = await supabase
            .from("orders")
            .select("*", { count: "exact", head: true });

        const customId = `JS-${dateStr}${String((count || 0) + 1).padStart(4, "0")}`;

        // Format Items Snapshot
        const orderItemsSnapshot = cartItems.map((item: any) => ({
            product_name: item.product_variants.products.name,
            variant_name: item.product_variants.variant,
            unit: item.product_variants.unit,
            quantity: item.quantity,
            price_at_purchase: item.product_variants.wholesale_price,
            subtotal: item.quantity * item.product_variants.wholesale_price,
            image:
                item.product_variants.products.product_images?.[0]?.image_url || null
        }));

        // Prepare Order Data
        const orderData = {

            order_id_custom: customId,

            user_id: user.id,

            address_id:
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                    selectedAddressId || ""
                )
                    ? selectedAddressId
                    : null,

            address_snapshot: selectedAddressText,

            total_amount: parseFloat(totalWithGst.toFixed(2)),

            total_payable_amount: parseFloat(totalWithGst.toFixed(2)),

            amount_paid_now: parseFloat(advanceAmount.toFixed(2)),

            remaining_balance: parseFloat(remainingBalance.toFixed(2)),

            payment_type: advanceAmount >= totalWithGst ? "full" : "partial",

            payment_status: "pending_manual",

            order_status: "processing",

            items: orderItemsSnapshot,

            balance_due_date: new Date(
                Date.now() + 10 * 24 * 60 * 60 * 1000
            )
                .toISOString()
                .split("T")[0]
        };

        // Insert Order
        const { data: order, error: insertError } = await supabase
            .from("orders")
            .insert([orderData])
            .select()
            .single();

        if (insertError) throw insertError;

        let screenshotUrl: string | null = null;

        // Upload Payment Proof
        if (transactionDetails.photo) {

            const fileExt = transactionDetails.photo.name.split(".").pop();

            const fileName = `payment-proof-${order.id}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from("payment-proofs")
                .upload(fileName, transactionDetails.photo, {
                    cacheControl: "3600",
                    upsert: false
                });

            if (uploadError) {

                console.error("Upload failed:", uploadError);

            } else {

                const { data } = supabase.storage
                    .from("payment-proofs")
                    .getPublicUrl(fileName);

                screenshotUrl = data.publicUrl;
            }
        }

        // Save Payment Record
        const { error: paymentError } = await supabase
            .from("payments")
            .insert([
                {
                    order_id: order.id,

                    user_id: user.id,

                    payment_method: paymentMethod,

                    payment_amount: advanceAmount,

                    bank_ref_number:
                        paymentMethod === "bank"
                            ? transactionDetails.transactionId
                            : null,

                    utr_number:
                        paymentMethod === "upi"
                            ? transactionDetails.utrNumber
                            : null,

                    payment_screenshot: screenshotUrl,

                    payment_status: "pending"
                }
            ]);

        if (paymentError) {
            console.error("Payment insert failed:", paymentError);
        }

        // Clear Cart
        await supabase
            .from("cart")
            .delete()
            .eq("user_id", user.id);

        window.dispatchEvent(new Event("cartUpdated"));

        toast.success(
            "Order placed successfully! Payment proof submitted for verification."
        );

        router.push("/Wholesale/orders");

    } catch (err: any) {

        toast.error(err.message || "An unexpected error occurred");

    } finally {

        setPayLoading(false);

        setShowPaymentProof(false);
    }
};

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setTransactionDetails(prev => ({ ...prev, photo: file }));
            toast.success("Payment proof uploaded!");
        } else {
            toast.error("Please upload a valid image file");
        }
    };


    // Add these missing handler functions
    const handleInputChange = (e: any) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    if (loading) return (
        <div className="h-screen flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-red-600 mb-4" size={40} />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preparing Secure Checkout...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20 font-sans">
            <Toaster position="top-right" />

            {/* Editorial Header */}
            <div className="bg-white border-b border-slate-100 py-12 px-4 mb-10">
                <div className="max-w-7xl mx-auto">
                    <Link href="/Wholesale/cart" className="group flex items-center gap-2 text-slate-400 hover:text-red-600 transition-colors mb-6 text-[10px] font-black uppercase tracking-widest">
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Cart
                    </Link>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full">Secure Sourcing</span>
                                <span className="text-slate-300 text-sm font-bold">Step 2 of 2</span>
                            </div>
                            <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">Checkout</h1>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-10">

                {/* LEFT SIDE: DETAILS */}
                <div className="lg:col-span-8 space-y-8">
                    {/* SHIPPING ADDRESS SECTION - SAME AS BEFORE */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-sm font-black uppercase tracking-tighter text-slate-900 flex items-center gap-2">
                                <MapPin size={18} className="text-red-600" /> Delivery Destination
                            </h3>
                            <button
                                onClick={() => setShowAddressForm(!showAddressForm)}
                                className="text-[10px] font-black text-red-600 uppercase bg-red-50 px-4 py-2 rounded-xl hover:bg-red-100 transition-all"
                            >
                                {showAddressForm ? "Cancel" : "+ Custom Address"}
                            </button>
                        </div>

                        {showAddressForm ? (
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 animate-in fade-in zoom-in-95 duration-300">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-4">Add New Location</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        name="full_name"
                                        value={formData.full_name}
                                        onChange={(e) => handleInputChange(e)}
                                        placeholder="Full Name"
                                        className="col-span-2 p-4 bg-white rounded-2xl border border-slate-200 outline-none focus:border-red-600 text-xs font-bold"
                                    />
                                    <input
                                        name="phone"
                                        value={formData.phone}
                                        onChange={(e) => handleInputChange(e)}
                                        placeholder="Phone"
                                        className="p-4 bg-white rounded-2xl border border-slate-200 outline-none focus:border-red-600 text-xs font-bold"
                                    />
                                    <input
                                        name="city"
                                        value={formData.city}
                                        onChange={(e) => handleInputChange(e)}
                                        placeholder="City"
                                        className="p-4 bg-white rounded-2xl border border-slate-200 outline-none focus:border-red-600 text-xs font-bold"
                                    />
                                    <textarea
                                        name="street_address"
                                        value={formData.street_address}
                                        onChange={(e) => handleInputChange(e)}
                                        placeholder="Full Street Address"
                                        className="col-span-2 p-4 bg-white rounded-2xl border border-slate-200 outline-none focus:border-red-600 text-xs font-bold h-20"
                                    />
                                    <button
                                        onClick={handleAddressSubmit}
                                        className="col-span-2 bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors"
                                    >
                                        Save & Use Address
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[...profileAddresses, ...dbAddresses.map(a => ({
                                    id: a.id,
                                    type: 'Custom',
                                    addr: `${a.street_address}, ${a.city}`,
                                    icon: <MapPin size={16} />
                                }))].map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => { setSelectedAddressId(item.id); setSelectedAddressText(item.addr); }}
                                        className={`p-6 rounded-[2rem] border-2 transition-all cursor-pointer flex flex-col justify-between group ${selectedAddressId === item.id ? "border-red-600 bg-red-50/20" : "border-slate-50 bg-white hover:border-slate-200"}`}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="text-[9px] font-black uppercase text-red-600 flex items-center gap-1.5">{item.icon} {item.type}</span>
                                            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedAddressId === item.id ? "border-red-600 bg-red-600 text-white" : "border-slate-200"}`}>
                                                {selectedAddressId === item.id && <CheckCircle2 size={12} />}
                                            </div>
                                        </div>
                                        <p className="text-[11px] font-bold text-slate-700 leading-relaxed">{item.addr}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ORDER MANIFEST - SAME AS BEFORE */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="bg-slate-50/50 px-8 py-5 border-b border-slate-100 flex justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Item Breakdown</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Wholesale Value</span>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {cartItems.map((item, i) => {
                                const variant = item.product_variants;
                                const product = variant.products;
                                const img = product.product_images?.[0]?.image_url;
                                return (
                                    <div key={i} className="p-6 flex items-center justify-between group">
                                        <div className="flex gap-5 items-center">
                                            <div className="h-12 w-12 bg-slate-50 rounded-xl relative overflow-hidden border border-slate-100 flex-shrink-0">
                                                <Image src={img || "/placeholder.png"} alt="Product" fill className="object-contain p-1" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-900 uppercase text-xs mb-0.5">{product.name}</h4>
                                                <p className="text-[9px] text-slate-400 font-bold tracking-tighter">Qty: {item.quantity}</p>
                                                <span className="font-black text-slate-900 text-sm">{variant.variant} - {variant.unit}</span>
                                            </div>
                                        </div>
                                        <span className="font-black text-slate-900 text-sm">₹{(item.quantity * variant.wholesale_price).toLocaleString()}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE: PREMIUM PAYMENT CARD */}
                <div className="lg:col-span-4">
                    <div className="bg-white rounded-[3rem] border border-slate-900 shadow-2xl overflow-hidden sticky top-28 transition-all">

                        {/* Summary Header */}
                        <div className="bg-slate-900 p-8 text-white">
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <ShieldCheck size={14} /> Verified Wholesale Order
                            </p>

                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <div className="text-xs font-bold text-slate-400 uppercase">Subtotal</div>
                                    <div className="text-sm font-black">₹{subtotal.toLocaleString()}</div>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-xs font-bold text-slate-400 uppercase">Bulk GST (18%)</div>
                                    <div className="text-sm font-black">₹{(subtotal * 0.18).toLocaleString()}</div>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-xs font-bold text-slate-400 uppercase">Transport Charge</div>
                                    <div className="text-sm font-black">₹{transportCharge.toLocaleString()}</div>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-xs font-bold text-slate-400 uppercase">Platform Fee</div>
                                    <div className="text-sm font-black">₹{platformCharge.toLocaleString()}</div>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-xs font-bold text-slate-400 uppercase">Handling Charge</div>
                                    <div className="text-sm font-black">₹{handlingCharge.toLocaleString()}</div>
                                </div>
                                <div className="h-px bg-slate-800 my-4" />
                                <div className="flex justify-between items-end">
                                    <div className="text-[10px] font-black text-white uppercase tracking-widest">Grand Total</div>
                                    <div className="text-3xl font-black tracking-tighter text-white">₹{totalWithGst.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Payment Section */}
                        <div className="p-8 space-y-8">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black uppercase text-slate-400">Set Advance Payment</label>
                                    <span className={`text-[9px] font-black px-2 py-1 rounded-full ${isAmountTooLow ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                        MIN: ₹{minRequired.toLocaleString()}
                                    </span>
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">₹</div>
                                    <input
                                        type="number"
                                        value={advanceAmount}
                                        onChange={(e) => handleAdvanceChange(Number(e.target.value))}
                                        className={`w-full bg-slate-50 border-2 rounded-[1.5rem] p-5 pl-10 text-2xl font-black outline-none transition-all ${isAmountTooLow ? 'border-red-200 text-red-600' : 'border-slate-100 text-slate-900 focus:border-red-600'}`}
                                    />
                                </div>
                                {isAmountTooLow && (
                                    <p className="text-[9px] font-black text-red-600 flex items-center gap-1 uppercase tracking-tighter">
                                        <AlertTriangle size={12} /> Minimum 15% is mandatory to reserve stock.
                                    </p>
                                )}
                            </div>

                            {/* Breakdown */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Remaining Due</span>
                                    <span className="font-black text-slate-900 text-sm">₹{remainingBalance.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* FIXED BUTTON - Always clickable, opens popup */}
                            <button
                                onClick={() => {
                                    if (!selectedAddressId || !selectedAddressText) {
                                        toast.error("Please select a delivery address first");
                                        return;
                                    }
                                    setShowPaymentPopup(true);
                                }}
                                className={`w-full py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 shadow-xl ${isAmountTooLow
                                    ? "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-200"
                                    : "bg-red-600 hover:bg-slate-900 text-white shadow-red-200 hover:scale-[1.02]"
                                    }`}
                                disabled={payLoading}
                            >
                                {payLoading ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <>
                                        <Wallet size={18} /> Pay Advance via Bank/UPI
                                    </>
                                )}
                            </button>

                            <div className="flex gap-3 items-start bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                                <Info className="text-blue-600 shrink-0" size={16} />
                                <p className="text-[9px] font-bold text-blue-900 uppercase leading-relaxed tracking-tighter">
                                    Balance ₹{remainingBalance.toLocaleString()} must be cleared within 10 days to initiate logistics dispatch.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
            {/* BANK/UPI PAYMENT POPUP */}
            {showPaymentPopup && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">

                        {/* Header Section - Clean White/Slate */}
                        <div className="bg-white border-b border-slate-100 p-6 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
                                    <Wallet className="text-red-600" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Secure Checkout</h3>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Transaction Protocol v2.0</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowPaymentPopup(false)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="overflow-y-auto custom-scrollbar bg-white">
                            {bankDetails ? (
                                <div className="p-8">
                                    {/* Top Row: Info Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                                            <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Total Amount</span>
                                            <p className="text-3xl font-black text-slate-900">₹{advanceAmount.toLocaleString()}</p>
                                        </div>

                                        <div className="md:col-span-2 flex bg-slate-50 p-1.5 rounded-3xl border border-slate-100">
                                            <button
                                                onClick={() => setPaymentMethod('bank')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-[11px] uppercase transition-all ${paymentMethod === 'bank' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                                            >
                                                <Building2 size={16} /> Bank Transfer
                                            </button>
                                            <button
                                                onClick={() => setPaymentMethod('upi')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-[11px] uppercase transition-all ${paymentMethod === 'upi' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                                            >
                                                <Smartphone size={16} /> UPI / QR
                                            </button>
                                        </div>
                                    </div>

                                    {/* Main Horizontal Workspace */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

                                        {/* Left: Credentials Display */}
                                        <div className="space-y-6">
                                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] px-2">Payment Details</h4>
                                            {paymentMethod === 'bank' ? (
                                                <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
                                                    <div className="space-y-6 relative z-10">
                                                        <div>
                                                            <p className="text-[10px] text-slate-400 uppercase font-bold">Account Name</p>
                                                            <p className="text-lg font-bold">{bankDetails.account_name}</p>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <p className="text-[10px] text-slate-400 uppercase font-bold">Account Number</p>
                                                                <p className="text-lg font-mono font-bold tracking-widest text-red-500">{bankDetails.account_number}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-slate-400 uppercase font-bold">IFSC</p>
                                                                <p className="text-lg font-mono font-bold">{bankDetails.ifsc_code}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-white border-2 border-slate-900 rounded-[2rem] p-8 flex flex-col items-center">
                                                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 mb-4">
                                                        {bankDetails.qr_image ? (
                                                            <Image src={bankDetails.qr_image} alt="QR" width={160} height={160} className="rounded-xl" />
                                                        ) : (
                                                            <QrCode size={120} className="text-slate-200" />
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Scan or Pay to UPI ID</p>
                                                    <p className="text-2xl font-black text-slate-900 select-all">{bankDetails.upi_id}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Right: Verification Form */}
                                        <div className="space-y-6">
                                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] px-2">Verify Transaction</h4>

                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                                                        {paymentMethod === 'bank' ? 'Bank Ref Number' : 'UPI UTR Number'}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="Enter Transaction ID..."
                                                        value={paymentMethod === 'bank' ? transactionDetails.transactionId : transactionDetails.utrNumber}
                                                        onChange={(e) => setTransactionDetails(prev => ({
                                                            ...prev,
                                                            [paymentMethod === 'bank' ? 'transactionId' : 'utrNumber']: e.target.value
                                                        }))}
                                                        /* FIXED: text-slate-900 for visibility */
                                                        className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-bold text-slate-900 placeholder:text-slate-300 focus:border-slate-900 focus:bg-white outline-none transition-all"
                                                    />
                                                </div>

                                                <label className="relative group cursor-pointer block">
                                                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                                                    <div className={`w-full py-10 border-2 border-dashed rounded-[2rem] transition-all flex flex-col items-center justify-center gap-3 ${transactionDetails.photo ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200 group-hover:bg-slate-100'}`}>
                                                        {transactionDetails.photo ? (
                                                            <>
                                                                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white">
                                                                    <CheckCircle2 size={24} />
                                                                </div>
                                                                <p className="font-black text-green-600 uppercase text-[10px]">Receipt Uploaded Successfully</p>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Camera size={32} className="text-slate-300 group-hover:scale-110 transition-transform" />
                                                                <p className="font-black text-slate-400 uppercase text-[10px]">Click to upload payment proof</p>
                                                            </>
                                                        )}
                                                    </div>
                                                </label>
                                            </div>

                                            {/* Final Action - ENABLED ONLY AFTER FILE UPLOAD */}
                                            <button
                                                onClick={handlePaymentProofSubmit}
                                                disabled={!transactionDetails.photo || payLoading}
                                                className={`w-full py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 transition-all ${!transactionDetails.photo || payLoading
                                                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                                                    : 'bg-red-600 text-white shadow-xl shadow-red-600/30 hover:bg-red-700 hover:scale-[1.01] active:scale-95'
                                                    }`}
                                            >
                                                {payLoading ? <Loader2 className="animate-spin" size={20} /> : <><CreditCard size={20} /> Confirm Payment</>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-20 text-center">
                                    <AlertCircle size={64} className="mx-auto text-slate-100 mb-4" />
                                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Gateway Configuration Required</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


const handleAddressSubmit = async () => {
    try {
        const userStr = localStorage.getItem("wholesale_user");
        const user = JSON.parse(userStr || "{}");

        if (!formData.full_name || !formData.phone || !formData.street_address || !formData.city) {
            toast.error("Please fill all required fields");
            return;
        }

        const { data, error } = await supabase
            .from("addresses")
            .insert([{
                user_id: user.id,
                ...formData
            }])
            .select()
            .single();

        if (error) throw error;

        toast.success("Address added!");
        setDbAddresses(prev => [...prev, data]);
        setSelectedAddressId(data.id);
        setSelectedAddressText(`${data.street_address}, ${data.city}`);
        setShowAddressForm(false);
        setFormData({ full_name: "", phone: "", street_address: "", city: "", state: "", pincode: "" });
    } catch (err: any) {
        toast.error(err.message);
    }
};