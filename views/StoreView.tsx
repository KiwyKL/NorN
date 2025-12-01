import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShoppingCart, Phone, Sparkles } from 'lucide-react';
import { ViewState, Language } from '../types';
import { translations } from '../services/translations';
import { billingService } from '../services/billingService';
import { Product } from '../constants/products';

interface Props {
    setViewState: (view: ViewState) => void;
    language: Language;
}

const StoreView: React.FC<Props> = ({ setViewState, language }) => {
    const t = translations[language];
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [availableCalls, setAvailableCalls] = useState(0);

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            const prods = await billingService.getProducts();
            setProducts(prods);
            setAvailableCalls(billingService.getAvailableCalls());
        } catch (error) {
            console.error('Failed to load products:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async (productId: string) => {
        setPurchasing(productId);

        try {
            const success = await billingService.purchase(productId);

            if (success) {
                // Actualizar balance de llamadas
                setAvailableCalls(billingService.getAvailableCalls());

                // Mostrar éxito
                const product = products.find(p => p.id === productId);
                if (product) {
                    alert(`¡Compra exitosa!\\n\\n+${product.calls} llamada${product.calls > 1 ? 's' : ''} agregada${product.calls > 1 ? 's' : ''} a tu cuenta.`);
                }
            } else {
                alert('Error en la compra. Intenta nuevamente.');
            }
        } catch (error) {
            console.error('Purchase error:', error);
            alert('Error en la compra. Verifica tu conexión.');
        } finally {
            setPurchasing(null);
        }
    };

    return (
        <div className="relative h-full w-full flex flex-col">
            <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url("/images/dashboard-bg.jpg")' }} />

            <div className="relative z-10 h-full w-full max-w-[375px] mx-auto overflow-hidden">
                {/* Back Button */}
                <div onClick={() => setViewState(ViewState.DASHBOARD)} className="absolute cursor-pointer z-20 flex items-center justify-center bg-white/20 rounded-full backdrop-blur-sm hover:bg-white/30 transition" style={{ left: '5.3%', top: '3%', width: '40px', height: '40px' }}>
                    <ArrowLeft className="text-white" />
                </div>

                {/* Title */}
                <div className="absolute z-20 flex items-center" style={{ left: '21.3%', top: '3.7%', width: '200px', height: '30px' }}>
                    <h2 className="text-white text-2xl font-bold font-christmas drop-shadow-lg" style={{ textShadow: '0 2px 4px black' }}>
                        {language === 'Spanish' ? 'Tienda' : 'Store'}
                    </h2>
                </div>

                {/* Main Content */}
                <div className="absolute z-10 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-xl overflow-y-auto no-scrollbar" style={{ left: '5.3%', top: '12%', width: '89.3%', height: '75%' }}>
                    <div className="p-6">

                        {/* Header - Available Calls */}
                        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-5 text-white mb-6 shadow-lg">
                            <div className="flex items-center gap-3 mb-2">
                                <Phone size={24} />
                                <h3 className="font-bold text-lg">
                                    {language === 'Spanish' ? 'Llamadas Disponibles' : 'Available Calls'}
                                </h3>
                            </div>
                            <p className="text-4xl font-black">{availableCalls}</p>
                            <p className="text-blue-100 text-sm mt-1">
                                {language === 'Spanish' ? 'Compra más llamadas abajo' : 'Purchase more calls below'}
                            </p>
                        </div>

                        {/* Loading State */}
                        {loading && (
                            <div className="text-center py-12">
                                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-white text-sm">{language === 'Spanish' ? 'Cargando productos...' : 'Loading products...'}</p>
                            </div>
                        )}

                        {/* Products List */}
                        {!loading && (
                            <div className="space-y-4">
                                {products.map((product) => (
                                    <div key={product.id} className="relative bg-white rounded-2xl p-5 shadow-lg border-2 border-slate-100 hover:border-blue-300 transition">

                                        {/* Badge */}
                                        {product.badge && (
                                            <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                                                {product.badge}
                                            </div>
                                        )}

                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <h4 className="text-xl font-bold text-slate-800 mb-1">{product.name}</h4>
                                                <p className="text-slate-500 text-sm">{product.description}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Sparkles size={20} className="text-yellow-500" />
                                                <span className="text-2xl font-black text-blue-600">{product.calls}</span>
                                                <span className="text-slate-600 text-sm">{product.calls === 1 ? (language === 'Spanish' ? 'llamada' : 'call') : (language === 'Spanish' ? 'llamadas' : 'calls')}</span>
                                            </div>

                                            <button
                                                onClick={() => handlePurchase(product.id)}
                                                disabled={purchasing !== null}
                                                className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg transition active:scale-95 ${purchasing === product.id
                                                        ? 'bg-slate-400 cursor-wait'
                                                        : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                                                    }`}
                                            >
                                                {purchasing === product.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                        <span>{language === 'Spanish' ? 'Comprando...' : 'Buying...'}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <ShoppingCart size={18} />
                                                        <span>{product.price}</span>
                                                    </div>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Info Notice */}
                        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <p className="text-blue-800 text-sm">
                                <strong>ℹ️ {language === 'Spanish' ? 'Nota' : 'Note'}:</strong><br />
                                {language === 'Spanish'
                                    ? 'Los precios se ajustan automáticamente según tu país.'
                                    : 'Prices are automatically adjusted for your country.'}
                            </p>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default StoreView;
