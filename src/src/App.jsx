import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, ShoppingCart, Calendar, ChefHat, Edit, Upload, FileText, Download, Save, LogOut, LogIn, Eye, EyeOff } from 'lucide-react';
import { supabase } from './supabase';

// ============================================================
// ÉCRAN DE CONNEXION
// ============================================================
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('Email ou mot de passe incorrect.');
      setLoading(false);
      return;
    }

    onLogin(data.user);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl mb-2">🍽️</h1>
          <h2 className="text-2xl font-bold text-gray-800">Calculateur de Commandes</h2>
          <p className="text-gray-500 mt-1">Connectez-vous pour accéder à l'application</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Mot de passe</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// APPLICATION PRINCIPALE
// ============================================================
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    // Écouter les changements de connexion
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl mb-4">🍽️</h1>
          <p className="text-gray-600 text-lg">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }

  return <RestaurantApp user={user} onLogout={handleLogout} />;
}

// ============================================================
// COMPOSANT RESTAURANT (toute l'application)
// ============================================================
function RestaurantApp({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('reservations');
  const [saveStatus, setSaveStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const [reservations, setReservations] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [articles, setArticles] = useState([]);
  const [recipes, setRecipes] = useState([]);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRecipeId, setEditingRecipeId] = useState(null);
  const [selectedDish, setSelectedDish] = useState(null);
  const [orders, setOrders] = useState([]);

  // ----------------------------------------------------------
  // CHARGEMENT DES DONNÉES DEPUIS SUPABASE
  // ----------------------------------------------------------
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, dishRes, artRes, recRes, resRes] = await Promise.all([
        supabase.from('categories').select('*').order('id'),
        supabase.from('dishes').select('*').order('id'),
        supabase.from('articles').select('*').order('id'),
        supabase.from('recipes').select('*').order('id'),
        supabase.from('reservations').select('*').order('id'),
      ]);

      if (catRes.data) setCategories(catRes.data.map(c => c.name));
      if (dishRes.data) setDishes(dishRes.data.map(d => ({
        id: d.id,
        name: d.name,
        category: d.category,
        recipeText: d.recipe_text || '',
        recipeImage: d.recipe_image || '',
      })));
      if (artRes.data) setArticles(artRes.data.map(a => ({
        id: a.id,
        reference: a.reference || '',
        productName: a.product_name,
        supplier: a.supplier || '',
        priceHT: parseFloat(a.price_ht) || 0,
        priceTTC: parseFloat(a.price_ttc) || 0,
        tvaRate: parseFloat(a.tva_rate) || 5.5,
        unit: a.unit || 'kg',
      })));
      if (recRes.data) setRecipes(recRes.data.map(r => ({
        id: r.id,
        dishId: r.dish_id,
        articleId: r.article_id,
        quantity: parseFloat(r.quantity) || 0,
      })));
      if (resRes.data) setReservations(resRes.data.map(r => ({
        id: r.id,
        date: r.date,
        clients: r.clients || 0,
        dish: r.dish,
      })));

      showStatus('✅ Données chargées !');
    } catch (error) {
      console.error('Erreur de chargement:', error);
      showStatus('❌ Erreur de chargement');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // ----------------------------------------------------------
  // CALCUL DES COMMANDES
  // ----------------------------------------------------------
  useEffect(() => {
    calculateOrders();
  }, [reservations, recipes, dishes, articles]);

  const showStatus = (msg) => {
    setSaveStatus(msg);
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const calculateOrders = () => {
    const orderMap = {};
    reservations.forEach(reservation => {
      const dish = dishes.find(d => d.name === reservation.dish);
      if (!dish) return;
      const dishRecipes = recipes.filter(r => r.dishId === dish.id);
      dishRecipes.forEach(recipe => {
        const article = articles.find(a => a.id === recipe.articleId);
        if (!article) return;
        const key = `${article.id}`;
        const totalQuantity = recipe.quantity * reservation.clients;
        if (orderMap[key]) {
          orderMap[key].quantity += totalQuantity;
        } else {
          orderMap[key] = {
            productName: article.productName,
            supplier: article.supplier,
            quantity: totalQuantity,
            unit: article.unit,
            priceHT: article.priceHT,
            priceTTC: article.priceTTC,
            tvaRate: article.tvaRate,
            totalCost: 0,
          };
        }
      });
    });
    const orderList = Object.values(orderMap)
      .map(order => ({ ...order, totalCost: order.quantity * order.priceTTC }))
      .sort((a, b) => a.productName.localeCompare(b.productName));
    setOrders(orderList);
  };

  // ----------------------------------------------------------
  // RÉSERVATIONS
  // ----------------------------------------------------------
  const addReservation = async () => {
    const { data, error } = await supabase.from('reservations').insert({
      date: new Date().toISOString().split('T')[0],
      clients: 0,
      dish: dishes[0]?.name || '',
    }).select().single();

    if (data) {
      setReservations([...reservations, { id: data.id, date: data.date, clients: data.clients, dish: data.dish }]);
    }
    if (error) console.error(error);
  };

  const updateReservation = async (id, field, value) => {
    setReservations(reservations.map(r => r.id === id ? { ...r, [field]: value } : r));
    await supabase.from('reservations').update({ [field]: value }).eq('id', id);
  };

  const deleteReservation = async (id) => {
    setReservations(reservations.filter(r => r.id !== id));
    await supabase.from('reservations').delete().eq('id', id);
  };

  // ----------------------------------------------------------
  // PLATS
  // ----------------------------------------------------------
  const addDish = async () => {
    const { data, error } = await supabase.from('dishes').insert({
      name: 'Nouveau plat',
      category: 'Plat',
      recipe_text: '',
      recipe_image: '',
    }).select().single();

    if (data) {
      setDishes([...dishes, {
        id: data.id,
        name: data.name,
        category: data.category,
        recipeText: data.recipe_text || '',
        recipeImage: data.recipe_image || '',
      }]);
    }
    if (error) console.error(error);
  };

  const updateDish = async (id, field, value) => {
    // Mettre à jour les réservations si le nom change
    if (field === 'name') {
      const oldName = dishes.find(d => d.id === id)?.name;
      if (oldName) {
        const updatedReservations = reservations.map(r =>
          r.dish === oldName ? { ...r, dish: value } : r
        );
        setReservations(updatedReservations);
        // Mettre à jour en base aussi
        await supabase.from('reservations').update({ dish: value }).eq('dish', oldName);
      }
    }

    setDishes(dishes.map(d => d.id === id ? { ...d, [field]: value } : d));

    // Mapper le nom du champ JS vers le nom de colonne SQL
    const fieldMap = {
      name: 'name',
      category: 'category',
      recipeText: 'recipe_text',
      recipeImage: 'recipe_image',
    };
    const dbField = fieldMap[field] || field;
    await supabase.from('dishes').update({ [dbField]: value }).eq('id', id);
  };

  const deleteDish = async (id) => {
    setDishes(dishes.filter(d => d.id !== id));
    setRecipes(recipes.filter(r => r.dishId !== id));
    if (selectedDish === id) setSelectedDish(null);
    await supabase.from('dishes').delete().eq('id', id);
  };

  // ----------------------------------------------------------
  // ARTICLES
  // ----------------------------------------------------------
  const addArticle = async () => {
    const { data, error } = await supabase.from('articles').insert({
      reference: '',
      product_name: 'Nouveau produit',
      supplier: 'Fournisseur',
      price_ht: 0,
      price_ttc: 0,
      tva_rate: 5.5,
      unit: 'kg',
    }).select().single();

    if (data) {
      setArticles([...articles, {
        id: data.id,
        reference: data.reference || '',
        productName: data.product_name,
        supplier: data.supplier || '',
        priceHT: parseFloat(data.price_ht) || 0,
        priceTTC: parseFloat(data.price_ttc) || 0,
        tvaRate: parseFloat(data.tva_rate) || 5.5,
        unit: data.unit || 'kg',
      }]);
    }
    if (error) console.error(error);
  };

  const updateArticle = async (id, field, value) => {
    let updatedArticle = null;

    setArticles(articles.map(a => {
      if (a.id !== id) return a;
      const updated = { ...a, [field]: value };
      if (field === 'priceHT' || field === 'tvaRate') {
        updated.priceTTC = parseFloat((updated.priceHT * (1 + updated.tvaRate / 100)).toFixed(2));
      } else if (field === 'priceTTC') {
        updated.priceHT = parseFloat((updated.priceTTC / (1 + updated.tvaRate / 100)).toFixed(2));
      }
      updatedArticle = updated;
      return updated;
    }));

    if (updatedArticle) {
      await supabase.from('articles').update({
        reference: updatedArticle.reference,
        product_name: updatedArticle.productName,
        supplier: updatedArticle.supplier,
        price_ht: updatedArticle.priceHT,
        price_ttc: updatedArticle.priceTTC,
        tva_rate: updatedArticle.tvaRate,
        unit: updatedArticle.unit,
      }).eq('id', id);
    }
  };

  const deleteArticle = async (id) => {
    setArticles(articles.filter(a => a.id !== id));
    setRecipes(recipes.filter(r => r.articleId !== id));
    await supabase.from('articles').delete().eq('id', id);
  };

  // ----------------------------------------------------------
  // RECETTES (ingrédients)
  // ----------------------------------------------------------
  const addIngredient = async (dishId) => {
    const firstArticle = articles[0];
    const { data, error } = await supabase.from('recipes').insert({
      dish_id: dishId,
      article_id: firstArticle?.id || null,
      quantity: 0,
    }).select().single();

    if (data) {
      const newRecipe = {
        id: data.id,
        dishId: data.dish_id,
        articleId: data.article_id,
        quantity: parseFloat(data.quantity) || 0,
      };
      setRecipes([...recipes, newRecipe]);
      setEditingRecipeId(data.id);
    }
    if (error) console.error(error);
  };

  const updateRecipe = async (id, field, value) => {
    setRecipes(recipes.map(r => r.id === id ? { ...r, [field]: value } : r));
    const fieldMap = { dishId: 'dish_id', articleId: 'article_id', quantity: 'quantity' };
    const dbField = fieldMap[field] || field;
    await supabase.from('recipes').update({ [dbField]: value }).eq('id', id);
  };

  const deleteRecipe = async (id) => {
    setRecipes(recipes.filter(r => r.id !== id));
    await supabase.from('recipes').delete().eq('id', id);
  };

  // ----------------------------------------------------------
  // CATÉGORIES
  // ----------------------------------------------------------
  const addCategory = async () => {
    const name = newCategoryName.trim();
    if (!name || categories.includes(name)) return;

    const { error } = await supabase.from('categories').insert({ name });
    if (!error) {
      setCategories([...categories, name]);
      setNewCategoryName('');
      showStatus('✅ Catégorie ajoutée !');
    }
  };

  const deleteCategory = async (categoryToDelete) => {
    if (categories.length <= 1) {
      showStatus('❌ Vous devez garder au moins une catégorie');
      return;
    }
    const dishesUsingCategory = dishes.filter(d => d.category === categoryToDelete);
    if (dishesUsingCategory.length > 0) {
      const confirmDelete = window.confirm(
        `${dishesUsingCategory.length} plat(s) utilise(nt) cette catégorie. Ils seront déplacés. Continuer ?`
      );
      if (!confirmDelete) return;
      const remaining = categories.filter(c => c !== categoryToDelete);
      for (const d of dishesUsingCategory) {
        await updateDish(d.id, 'category', remaining[0]);
      }
    }
    await supabase.from('categories').delete().eq('name', categoryToDelete);
    setCategories(categories.filter(c => c !== categoryToDelete));
    showStatus('✅ Catégorie supprimée !');
  };

  // ----------------------------------------------------------
  // IMPORT CSV ARTICLES
  // ----------------------------------------------------------
  const handleCsvUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      // Parse CSV simple
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) throw new Error('Le fichier est vide');

      const separator = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());

      const newArticles = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(separator).map(v => v.trim());
        const row = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

        const reference = row.reference || row['référence'] || row.ref || '';
        const productName = row.productname || row.produit || row['nom du produit'] || row.product || 'Produit';
        const supplier = row.supplier || row.fournisseur || 'Fournisseur';
        const priceHT = parseFloat((row.priceht || row['prix ht'] || row.prix_ht || '0').replace(',', '.'));
        const priceTTC = parseFloat((row.pricettc || row['prix ttc'] || row.prix_ttc || '0').replace(',', '.'));
        const tvaRate = parseFloat((row.tvarate || row.tva || row['taux tva'] || '5.5').replace(',', '.'));
        const unit = row.unit || row['unité'] || row.unite || 'kg';

        let finalHT = priceHT;
        let finalTTC = priceTTC;
        if ((!finalTTC || finalTTC === 0) && finalHT > 0) {
          finalTTC = parseFloat((finalHT * (1 + tvaRate / 100)).toFixed(2));
        }
        if ((!finalHT || finalHT === 0) && finalTTC > 0) {
          finalHT = parseFloat((finalTTC / (1 + tvaRate / 100)).toFixed(2));
        }

        newArticles.push({
          reference: String(reference),
          product_name: String(productName),
          supplier: String(supplier),
          price_ht: finalHT || 0,
          price_ttc: finalTTC || 0,
          tva_rate: tvaRate || 5.5,
          unit: String(unit),
        });
      }

      const { data, error } = await supabase.from('articles').insert(newArticles).select();
      if (error) throw error;

      if (data) {
        const mapped = data.map(a => ({
          id: a.id,
          reference: a.reference || '',
          productName: a.product_name,
          supplier: a.supplier || '',
          priceHT: parseFloat(a.price_ht) || 0,
          priceTTC: parseFloat(a.price_ttc) || 0,
          tvaRate: parseFloat(a.tva_rate) || 5.5,
          unit: a.unit || 'kg',
        }));
        setArticles([...articles, ...mapped]);
        showStatus(`✅ ${mapped.length} articles importés !`);
      }
    } catch (error) {
      console.error('Erreur import CSV:', error);
      showStatus(`❌ Erreur: ${error.message}`);
    }
    event.target.value = '';
  };

  // ----------------------------------------------------------
  // EXPORT JSON
  // ----------------------------------------------------------
  const exportData = () => {
    const data = { reservations, dishes, articles, recipes, categories };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `restaurant-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ----------------------------------------------------------
  // UPLOAD IMAGE
  // ----------------------------------------------------------
  const handleImageUpload = (dishId, event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateDish(dishId, 'recipeImage', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // ----------------------------------------------------------
  // GÉNÉRER PDF RECETTE
  // ----------------------------------------------------------
  const generateRecipePDF = (dishId, servings = 10) => {
    const dish = dishes.find(d => d.id === dishId);
    if (!dish) return;
    const dishRecipes = recipes.filter(r => r.dishId === dishId);

    let htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto}
      h1{color:#2c5f2d;border-bottom:3px solid #2c5f2d;padding-bottom:10px}
      .info{background:#f0f9ff;padding:15px;border-radius:8px;margin-bottom:30px;border-left:4px solid #3b82f6}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      th{background:#f3f4f6;padding:12px;text-align:left;border-bottom:2px solid #d1d5db}
      td{padding:10px 12px;border-bottom:1px solid #e5e7eb}
      .recipe-text{line-height:1.8;color:#374151;white-space:pre-wrap;background:#f9fafb;padding:20px;border-radius:8px;border-left:4px solid #10b981}
      .cost{background:#ecfdf5;padding:15px;border-radius:8px;border-left:4px solid #10b981}
    </style></head><body>
      <h1>🍽️ ${dish.name}</h1>
      <div class="info"><p><strong>👥 Nombre de personnes :</strong> ${servings}</p></div>
      <h2>📋 Ingrédients</h2><table><thead><tr><th>Ingrédient</th><th>Fournisseur</th><th style="text-align:right">Quantité</th><th>Unité</th></tr></thead><tbody>`;

    let totalCostHT = 0, totalCostTTC = 0;
    dishRecipes.forEach(recipe => {
      const article = articles.find(a => a.id === recipe.articleId);
      if (article) {
        const qty = recipe.quantity * servings;
        totalCostHT += qty * article.priceHT;
        totalCostTTC += qty * article.priceTTC;
        htmlContent += `<tr><td><strong>${article.productName}</strong></td><td>${article.supplier}</td><td style="text-align:right"><strong>${qty.toFixed(3)}</strong></td><td>${article.unit}</td></tr>`;
      }
    });

    htmlContent += `</tbody></table>`;
    if (dish.recipeText) {
      htmlContent += `<h2>👨‍🍳 Préparation</h2><div class="recipe-text">${dish.recipeText}</div>`;
    }
    htmlContent += `<div class="cost">
      <h3>💰 Coût (${servings} pers.)</h3>
      <p><strong>HT :</strong> ${totalCostHT.toFixed(2)}€ (${(totalCostHT / servings).toFixed(2)}€/pers)</p>
      <p><strong>TTC :</strong> ${totalCostTTC.toFixed(2)}€ (${(totalCostTTC / servings).toFixed(2)}€/pers)</p>
      <p><strong>+10% HT :</strong> ${(totalCostHT * 1.1).toFixed(2)}€ | <strong>+10% TTC :</strong> ${(totalCostTTC * 1.1).toFixed(2)}€</p>
    </div></body></html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recette_${dish.name.replace(/\s+/g, '_')}_${servings}pers.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ----------------------------------------------------------
  // HELPERS
  // ----------------------------------------------------------
  const getCategoryIcon = (category) => {
    const c = category.toLowerCase();
    if (c.includes('entrée') || c.includes('entree')) return '🥗';
    if (c.includes('plat')) return '🍽️';
    if (c.includes('dessert')) return '🍰';
    if (c.includes('accompagnement')) return '🥖';
    if (c.includes('boisson')) return '🥤';
    if (c.includes('apéritif') || c.includes('aperitif')) return '🍸';
    return '🍴';
  };

  // ----------------------------------------------------------
  // ÉCRAN DE CHARGEMENT
  // ----------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl mb-4">🍽️</h1>
          <p className="text-gray-600 text-lg">Chargement des données...</p>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------
  // RENDU PRINCIPAL
  // ----------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🍽️ Calculateur de Commandes</h1>
          <p className="text-gray-600">Automatisez vos commandes fournisseurs en temps réel</p>
          <p className="text-sm text-gray-400 mt-1">Connecté : {user.email}</p>

          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={loadAllData}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-md font-semibold"
            >
              <Save className="w-5 h-5" />
              Rafraîchir
            </button>
            <button
              onClick={exportData}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-md"
            >
              <Download className="w-5 h-5" />
              Exporter JSON
            </button>
            <button
              onClick={onLogout}
              className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 flex items-center gap-2 shadow-md"
            >
              <LogOut className="w-5 h-5" />
              Déconnexion
            </button>
            {saveStatus && (
              <span className="text-sm font-semibold bg-white px-4 py-2 rounded-lg shadow-md">{saveStatus}</span>
            )}
          </div>
        </div>

        {/* TABS */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="flex border-b border-gray-200">
            {[
              { key: 'reservations', label: 'Réservations', icon: Calendar, color: 'orange' },
              { key: 'articles', label: 'Base Articles', icon: ShoppingCart, color: 'yellow' },
              { key: 'dishes', label: 'Plats', icon: ChefHat, color: 'green' },
              { key: 'recipes', label: 'Détail Recettes', icon: Edit, color: 'blue' },
              { key: 'orders', label: 'Commandes', icon: ShoppingCart, color: 'purple' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 ${
                  activeTab === tab.key
                    ? `bg-${tab.color}-500 text-white`
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* ==================== RÉSERVATIONS ==================== */}
            {activeTab === 'reservations' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">Gérer les Réservations</h2>
                  <button onClick={addReservation} className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Ajouter
                  </button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {reservations.map(res => (
                    <div key={res.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="grid grid-cols-3 gap-3 mb-2">
                        <input type="date" value={res.date} onChange={(e) => updateReservation(res.id, 'date', e.target.value)} className="px-3 py-2 border border-gray-300 rounded" />
                        <input type="number" value={res.clients} onChange={(e) => updateReservation(res.id, 'clients', parseInt(e.target.value) || 0)} placeholder="Clients" className="px-3 py-2 border border-gray-300 rounded" />
                        <select value={res.dish} onChange={(e) => updateReservation(res.id, 'dish', e.target.value)} className="px-3 py-2 border border-gray-300 rounded">
                          {dishes.map(dish => (<option key={dish.id} value={dish.name}>{dish.name}</option>))}
                        </select>
                      </div>
                      <button onClick={() => deleteReservation(res.id)} className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1">
                        <Trash2 className="w-4 h-4" /> Supprimer
                      </button>
                    </div>
                  ))}
                  {reservations.length === 0 && <p className="text-gray-500 text-center py-8">Aucune réservation. Cliquez sur "Ajouter" pour commencer.</p>}
                </div>
              </div>
            )}

            {/* ==================== ARTICLES ==================== */}
            {activeTab === 'articles' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">Base Articles Fournisseurs</h2>
                  <div className="flex gap-2">
                    <label className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center gap-2 cursor-pointer">
                      <Upload className="w-4 h-4" /> Importer CSV
                      <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
                    </label>
                    <button onClick={addArticle} className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Ajouter
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Référence</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Produit</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Fournisseur</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">Prix HT</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">TVA (%)</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">Prix TTC</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Unité</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {articles.map(article => (
                        <tr key={article.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-3"><input type="text" value={article.reference} onChange={(e) => updateArticle(article.id, 'reference', e.target.value)} placeholder="REF-001" className="w-full px-2 py-1 border border-gray-300 rounded" /></td>
                          <td className="px-4 py-3"><input type="text" value={article.productName} onChange={(e) => updateArticle(article.id, 'productName', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded" /></td>
                          <td className="px-4 py-3"><input type="text" value={article.supplier} onChange={(e) => updateArticle(article.id, 'supplier', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded" /></td>
                          <td className="px-4 py-3"><input type="number" step="0.01" value={article.priceHT} onChange={(e) => updateArticle(article.id, 'priceHT', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1 border border-gray-300 rounded text-right" /></td>
                          <td className="px-4 py-3">
                            <select value={article.tvaRate} onChange={(e) => updateArticle(article.id, 'tvaRate', parseFloat(e.target.value))} className="w-full px-2 py-1 border border-gray-300 rounded text-right">
                              <option value="5.5">5.5%</option>
                              <option value="10">10%</option>
                              <option value="20">20%</option>
                            </select>
                          </td>
                          <td className="px-4 py-3"><input type="number" step="0.01" value={article.priceTTC} onChange={(e) => updateArticle(article.id, 'priceTTC', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1 border border-gray-300 rounded text-right bg-blue-50 font-semibold" /></td>
                          <td className="px-4 py-3">
                            <select value={article.unit} onChange={(e) => updateArticle(article.id, 'unit', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded">
                              <option value="kg">kg</option><option value="L">L</option><option value="unité">unité</option><option value="g">g</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => deleteArticle(article.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4 inline" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ==================== PLATS ==================== */}
            {activeTab === 'dishes' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Liste des Plats</h2>
                  <button onClick={addDish} className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Ajouter un plat
                  </button>
                </div>

                {/* Gestion catégories */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">🏷️ Gérer les catégories</h3>
                  <div className="flex gap-2 mb-4">
                    <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addCategory()} placeholder="Nouvelle catégorie..." className="flex-1 px-4 py-2 border border-gray-300 rounded-lg" />
                    <button onClick={addCategory} className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 flex items-center gap-2 font-semibold">
                      <Plus className="w-4 h-4" /> Ajouter
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(category => (
                      <div key={category} className="bg-white px-4 py-2 rounded-full border-2 border-purple-300 flex items-center gap-2 shadow-sm">
                        <span className="font-semibold text-gray-700">{getCategoryIcon(category)} {category}</span>
                        <button onClick={() => deleteCategory(category)} className="text-red-500 hover:text-red-700 ml-1"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>

                {categories.map(category => {
                  const categoryDishes = dishes.filter(d => d.category === category);
                  if (categoryDishes.length === 0) return null;
                  return (
                    <div key={category} className="mb-8">
                      <h3 className="text-xl font-bold text-gray-700 mb-4 pb-2 border-b-2 border-gray-300">{getCategoryIcon(category)} {category}</h3>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categoryDishes.map(dish => (
                          <div key={dish.id} className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-200 shadow-sm">
                            <input type="text" value={dish.name} onChange={(e) => updateDish(dish.id, 'name', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded mb-2 font-semibold text-lg" />
                            <select value={dish.category} onChange={(e) => updateDish(dish.id, 'category', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded mb-3 text-sm">
                              {categories.map(cat => (<option key={cat} value={cat}>{getCategoryIcon(cat)} {cat}</option>))}
                            </select>
                            <div className="flex gap-2">
                              <button onClick={() => { setSelectedDish(dish.id); setActiveTab('recipes'); }} className="flex-1 bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 text-sm">Voir recette</button>
                              <button onClick={() => deleteDish(dish.id)} className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {dishes.length === 0 && <p className="text-gray-500 text-center py-8">Aucun plat. Cliquez sur "Ajouter un plat" pour commencer.</p>}
              </div>
            )}

            {/* ==================== RECETTES ==================== */}
            {activeTab === 'recipes' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Détail des Recettes</h2>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Sélectionner un plat</label>
                  <select value={selectedDish || ''} onChange={(e) => setSelectedDish(parseInt(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    <option value="">-- Choisir un plat --</option>
                    {dishes.map(dish => (<option key={dish.id} value={dish.id}>{dish.name}</option>))}
                  </select>
                </div>

                {selectedDish && (() => {
                  const currentDish = dishes.find(d => d.id === selectedDish);
                  if (!currentDish) return null;
                  const dishRecipes = recipes.filter(r => r.dishId === selectedDish);
                  let totalCostHT = 0, totalCostTTC = 0;
                  dishRecipes.forEach(r => {
                    const a = articles.find(ar => ar.id === r.articleId);
                    if (a) { totalCostHT += r.quantity * a.priceHT; totalCostTTC += r.quantity * a.priceTTC; }
                  });

                  return (
                    <div>
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-bold text-gray-700">{currentDish.name}</h3>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <label className="text-sm font-semibold text-gray-700">Personnes:</label>
                              <input type="number" min="1" defaultValue="10" id={`servings-${selectedDish}`} className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center" />
                            </div>
                            <button onClick={() => { const s = parseInt(document.getElementById(`servings-${selectedDish}`).value) || 10; generateRecipePDF(selectedDish, s); }} className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 flex items-center gap-2 shadow-md">
                              <Download className="w-4 h-4" /> Télécharger PDF
                            </button>
                          </div>
                        </div>

                        {/* Coûts */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border-2 border-blue-300">
                            <h4 className="text-sm font-semibold text-blue-800 mb-2">💰 Coût par personne</h4>
                            <p className="text-lg font-bold text-blue-900">HT: {totalCostHT.toFixed(2)}€</p>
                            <p className="text-lg font-bold text-blue-900">TTC: {totalCostTTC.toFixed(2)}€</p>
                          </div>
                          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border-2 border-green-300">
                            <h4 className="text-sm font-semibold text-green-800 mb-2">📈 Coût majoré +10%</h4>
                            <p className="text-lg font-bold text-green-900">HT: {(totalCostHT * 1.1).toFixed(2)}€</p>
                            <p className="text-lg font-bold text-green-900">TTC: {(totalCostTTC * 1.1).toFixed(2)}€</p>
                          </div>
                        </div>

                        {/* Instructions */}
                        <div className="mb-4">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">📝 Instructions de la recette</label>
                          <textarea value={currentDish.recipeText} onChange={(e) => updateDish(selectedDish, 'recipeText', e.target.value)} placeholder="Écrivez ou collez ici les instructions..." className="w-full px-4 py-3 border border-gray-300 rounded-lg min-h-[150px] resize-y" />
                        </div>

                        {/* Image */}
                        <div className="mb-4">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">📷 Photo de la recette</label>
                          <div className="flex gap-4 items-start">
                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(selectedDish, e)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                            {currentDish.recipeImage && <button onClick={() => updateDish(selectedDish, 'recipeImage', '')} className="text-red-500 hover:text-red-700 text-sm">Supprimer</button>}
                          </div>
                          {currentDish.recipeImage && <img src={currentDish.recipeImage} alt="Recette" className="mt-3 max-w-md rounded-lg border-2 border-gray-300 shadow-md" />}
                        </div>
                      </div>

                      {/* Ingrédients */}
                      <div className="flex items-center justify-between mb-4 pt-4 border-t border-gray-300">
                        <h3 className="text-xl font-bold text-gray-700">Ingrédients</h3>
                        <button onClick={() => addIngredient(selectedDish)} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-2">
                          <Plus className="w-4 h-4" /> Ajouter ingrédient
                        </button>
                      </div>

                      <div className="space-y-3">
                        {dishRecipes.map(recipe => {
                          const article = articles.find(a => a.id === recipe.articleId);
                          const isEditing = editingRecipeId === recipe.id;
                          return (
                            <div key={recipe.id} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                              <div className="grid grid-cols-12 gap-3 mb-2">
                                <div className="col-span-6">
                                  <label className="block text-xs text-gray-600 mb-1">Article</label>
                                  {!isEditing ? (
                                    <div onClick={() => setEditingRecipeId(recipe.id)} className="w-full px-3 py-2 border border-gray-300 rounded bg-white cursor-pointer hover:bg-gray-50 flex items-center justify-between">
                                      <span>{article ? `${article.reference ? `[${article.reference}] ` : ''}${article.productName} - ${article.supplier} (${article.priceTTC}€/${article.unit})` : 'Sélectionner'}</span>
                                      <span className="text-xs text-blue-600">✏️</span>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <input type="text" placeholder="Rechercher..." onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" autoFocus />
                                      <select value={recipe.articleId || ''} onChange={(e) => { updateRecipe(recipe.id, 'articleId', parseInt(e.target.value)); setEditingRecipeId(null); setSearchTerm(''); }} className="w-full px-3 py-2 border border-gray-300 rounded" size="5">
                                        {articles.filter(a => !searchTerm || a.productName.toLowerCase().includes(searchTerm.toLowerCase()) || a.supplier.toLowerCase().includes(searchTerm.toLowerCase()) || (a.reference && a.reference.toLowerCase().includes(searchTerm.toLowerCase()))).map(a => (
                                          <option key={a.id} value={a.id}>{a.reference ? `[${a.reference}] ` : ''}{a.productName} - {a.supplier} ({a.priceTTC}€/{a.unit})</option>
                                        ))}
                                      </select>
                                      <button onClick={() => { setEditingRecipeId(null); setSearchTerm(''); }} className="text-sm text-gray-600 hover:text-gray-800">✖️ Annuler</button>
                                    </div>
                                  )}
                                </div>
                                <div className="col-span-3">
                                  <label className="block text-xs text-gray-600 mb-1">Quantité / pers.</label>
                                  <input type="number" step="0.001" value={recipe.quantity} onChange={(e) => updateRecipe(recipe.id, 'quantity', parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded" />
                                </div>
                                <div className="col-span-3">
                                  <label className="block text-xs text-gray-600 mb-1">Unité</label>
                                  <input type="text" value={article?.unit || ''} disabled className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100" />
                                </div>
                              </div>
                              {article && <div className="text-sm text-gray-600 mb-2">📦 <strong>{article.productName}</strong> de <em>{article.supplier}</em> - HT: {article.priceHT}€/{article.unit} | TVA: {article.tvaRate}% | TTC: {article.priceTTC}€/{article.unit}</div>}
                              <button onClick={() => deleteRecipe(recipe.id)} className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"><Trash2 className="w-4 h-4" /> Supprimer</button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ==================== COMMANDES ==================== */}
            {activeTab === 'orders' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Commandes Fournisseurs</h2>
                {orders.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Ajoutez des réservations pour voir les commandes</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Produit</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Fournisseur</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Quantité</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Unité</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Prix HT</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Prix TTC</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">TVA</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Coût total TTC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order, idx) => (
                          <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-800">{order.productName}</td>
                            <td className="px-4 py-3 text-gray-600">{order.supplier}</td>
                            <td className="px-4 py-3 text-right text-lg font-bold text-purple-600">{order.quantity.toFixed(3)}</td>
                            <td className="px-4 py-3 text-gray-600">{order.unit}</td>
                            <td className="px-4 py-3 text-right text-gray-700">{order.priceHT.toFixed(2)}€</td>
                            <td className="px-4 py-3 text-right text-gray-700 font-semibold">{order.priceTTC.toFixed(2)}€</td>
                            <td className="px-4 py-3 text-right text-gray-600">{order.tvaRate}%</td>
                            <td className="px-4 py-3 text-right text-lg font-bold text-green-600">{order.totalCost.toFixed(2)}€</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-100 font-bold">
                          <td colSpan="7" className="px-4 py-3 text-right">TOTAL COMMANDE TTC:</td>
                          <td className="px-4 py-3 text-right text-xl text-green-700">{orders.reduce((sum, o) => sum + o.totalCost, 0).toFixed(2)}€</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            💡 <strong>Astuce :</strong> Toutes vos modifications sont sauvegardées automatiquement dans la base de données. Votre équipe voit les mêmes données en temps réel !
          </p>
        </div>
      </div>
    </div>
  );
}
