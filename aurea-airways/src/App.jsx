
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Plane, ArrowLeftRight, CalendarDays, Users, Search,
  ShieldCheck, Globe2, Sparkles, LogOut, ArrowRight
} from "lucide-react";
import "./index.css";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "https://example.supabase.co",
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "placeholder-key"
);

const airports = [
  { code: "MAD", city: "Madrid" },
  { code: "BCN", city: "Barcelona" },
  { code: "LHR", city: "Londres" },
  { code: "CDG", city: "París" },
  { code: "FCO", city: "Roma" },
  { code: "JFK", city: "Nueva York" },
  { code: "LIS", city: "Lisboa" },
  { code: "DXB", city: "Dubái" }
];

const flights = [
  { from: "MAD", to: "LHR", time: "09:15", arrival: "10:35", price: 119 },
  { from: "MAD", to: "CDG", time: "11:40", arrival: "13:45", price: 145 },
  { from: "MAD", to: "FCO", time: "14:20", arrival: "16:45", price: 159 },
  { from: "MAD", to: "JFK", time: "10:30", arrival: "13:05", price: 489 },
  { from: "BCN", to: "LHR", time: "08:45", arrival: "10:15", price: 99 },
  { from: "BCN", to: "LIS", time: "16:10", arrival: "17:20", price: 79 },
  { from: "LHR", to: "JFK", time: "12:00", arrival: "15:10", price: 429 },
  { from: "MAD", to: "DXB", time: "21:30", arrival: "06:50", price: 379 }
];

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const [origin, setOrigin] = useState("MAD");
  const [destination, setDestination] = useState("LHR");
  const [departure, setDeparture] = useState(localDate());
  const [returnDate, setReturnDate] = useState("");
  const [passengers, setPassengers] = useState("1");
  const [roundTrip, setRoundTrip] = useState(true);
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) setError(error.message);
      setSession(data?.session ?? null);
      setReady(true);
    }).catch(() => {
      if (alive) {
        setError("No se pudo conectar con Supabase. Comprueba el archivo .env.");
        setReady(true);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session?.user) loadHistory();
    else setHistory([]);
  }, [session?.user?.id]);

  async function loadHistory() {
    const { data, error } = await supabase
      .from("flight_searches")
      .select("id, origin, destination, departure_date, passengers")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) setError("Error cargando el historial: " + error.message);
    else setHistory(data || []);
  }

  async function handleAuth(e) {
    e.preventDefault();
    setError("");
    setNotice("");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password
        });
        if (error) throw error;

        if (data.session) {
          setNotice("¡Cuenta creada! Bienvenido a MEJIA AIRLINE.");
        } else {
          setMode("login");
          setNotice("Revisa tu correo para confirmar el registro.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (error) throw error;
        setNotice("¡Bienvenido a bordo!");
      }
      setPassword("");
    } catch (err) {
      setError(err.message || "No se pudo completar el acceso.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) setError(error.message);
    else {
      setResults(null);
      setNotice("Has cerrado sesión.");
    }
  }

  async function searchFlights(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setResults(null);

    if (origin === destination) {
      setError("El origen y el destino deben ser diferentes.");
      return;
    }

    if (departure < localDate()) {
      setError("Selecciona una fecha válida.");
      return;
    }

    if (roundTrip && returnDate && returnDate < departure) {
      setError("La vuelta no puede ser anterior a la salida.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("flight_searches").insert({
        user_id: session.user.id,
        origin,
        destination,
        departure_date: departure,
        return_date: roundTrip && returnDate ? returnDate : null,
        passengers: Number(passengers)
      });

      if (error) throw error;

      setResults(flights.filter(
        f => f.from === origin && f.to === destination
      ));

      await loadHistory();
      setNotice("Tu búsqueda se ha guardado correctamente.");
    } catch (err) {
      setError("No se pudo guardar la búsqueda: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return <div className="loading-screen"><Plane /> Preparando tu viaje...</div>;
  }

  if (!session) {
    return (
      <main className="auth-screen">
        <div className="auth-photo" />
        <header className="auth-brand">
          <Plane size={28} />
          <div><strong>MEJIA</strong><small>A I R l I Y N E</small></div>
        </header>

        <section className="auth-copy">
          <span className="eyebrow"><Sparkles size={15} /> THE ART OF TRAVEL</span>
          <h1>El mundo<br />a tu <em>alcance.</em></h1>
          <p>Destinos extraordinarios. Experiencias inolvidables.</p>
          <span className="secure"><ShieldCheck /> Acceso seguro para viajeros</span>
        </section>

        <form className="auth-card" onSubmit={handleAuth}>
          <span className="eyebrow">BIENVENIDO A BORDO</span>
          <h2>{mode === "login" ? "Tu viaje comienza aquí" : "Únete a MEJIA"}</h2>
          <p>Accede a tu cuenta y descubre tu próximo destino.</p>

          <div className="auth-tabs">
            <button type="button" className={mode === "login" ? "active" : ""}
              onClick={() => { setMode("login"); setError(""); setNotice(""); }}>
              Iniciar sesión
            </button>
            <button type="button" className={mode === "register" ? "active" : ""}
              onClick={() => { setMode("register"); setError(""); setNotice(""); }}>
              Crear cuenta
            </button>
          </div>

          <label htmlFor="email">Correo electrónico</label>
          <input id="email" type="email" autoComplete="email"
            placeholder="tu@correo.com" value={email}
            onChange={e => setEmail(e.target.value)} required />

          <label htmlFor="password">Contraseña</label>
          <input id="password" type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="Mínimo 8 caracteres" value={password}
            onChange={e => setPassword(e.target.value)}
            minLength={8} required />

          {error && <div className="message error">{error}</div>}
          {notice && <div className="message success">{notice}</div>}

          <button className="gold-button full-button" disabled={loading}>
            {loading ? "Un momento..." : mode === "login" ? "Entrar a mi cuenta" : "Crear mi cuenta"}
            <ArrowRight size={17} />
          </button>
          <small className="secure"><ShieldCheck /> Tus credenciales se gestionan de forma segura.</small>
        </form>
      </main>
    );
  }

  return (
    <main className="site">
      <nav className="navbar">
        <a href="#inicio" className="brand">
          <Plane /><span><strong>MEJIA</strong><small>A I R L I N E</small></span>
        </a>
        <div className="nav-links">
          <a href="#inicio">Inicio</a>
          <a href="#buscar">Vuelos</a>
          <a href="#historial">Mis búsquedas</a>
        </div>
        <div className="nav-user">
          <span>{session.user.email}</span>
          <button className="icon-button" onClick={logout} title="Cerrar sesión"><LogOut /></button>
        </div>
      </nav>

      <section className="hero" id="inicio">
        <div className="hero-image" />
        <div className="hero-shade" />
        <div className="hero-content">
          <span className="eyebrow"><Sparkles size={15} /> VIAJAR ES UN ARTE</span>
          <h1>Más allá de lo<br />que <em>imaginas.</em></h1>
          <p>El lujo de llegar a donde sueñas.</p>
          <a href="#buscar" className="gold-button">Encuentra tu próximo vuelo <ArrowRight /></a>
        </div>
      </section>

      <section className="booking-wrap" id="buscar">
        <span className="eyebrow">TU PRÓXIMA EXPERIENCIA</span>
        <h2>Encuentra tu vuelo</h2>

        <div className="trip-tabs">
          <button className={roundTrip ? "active" : ""} onClick={() => setRoundTrip(true)}>Ida y vuelta</button>
          <button className={!roundTrip ? "active" : ""} onClick={() => setRoundTrip(false)}>Solo ida</button>
        </div>

        <form className="flight-form" onSubmit={searchFlights}>
          <div className="field">
            <label><Plane size={15} /> ORIGEN</label>
            <select value={origin} onChange={e => setOrigin(e.target.value)}>
              {airports.map(a => <option key={a.code} value={a.code}>{a.city} ({a.code})</option>)}
            </select>
          </div>

          <button type="button" className="swap-button" title="Intercambiar" onClick={() => {
            setOrigin(destination); setDestination(origin);
          }}><ArrowLeftRight /></button>

          <div className="field">
            <label><Plane size={15} /> DESTINO</label>
            <select value={destination} onChange={e => setDestination(e.target.value)}>
              {airports.map(a => <option key={a.code} value={a.code}>{a.city} ({a.code})</option>)}
            </select>
          </div>

          <div className="field">
            <label><CalendarDays size={15} /> SALIDA</label>
            <input type="date" min={localDate()} value={departure}
              onChange={e => setDeparture(e.target.value)} required />
          </div>

          {roundTrip && <div className="field">
            <label><CalendarDays size={15} /> REGRESO</label>
            <input type="date" min={departure} value={returnDate}
              onChange={e => setReturnDate(e.target.value)} />
          </div>}

          <div className="field">
            <label><Users size={15} /> PASAJEROS</label>
            <select value={passengers} onChange={e => setPassengers(e.target.value)}>
              {[1,2,3,4,5,6,7,8,9].map(n =>
                <option key={n} value={n}>{n} {n === 1 ? "pasajero" : "pasajeros"}</option>
              )}
            </select>
          </div>

          <button className="gold-button" disabled={loading}>
            <Search size={18} /> {loading ? "Buscando..." : "Buscar vuelos"}
          </button>
        </form>

        <p className="demo-notice"><ShieldCheck size={16} /> Los vuelos son ejemplos; no son ofertas reales.</p>
        {error && <div className="message error">{error}</div>}
        {notice && <div className="message success">{notice}</div>}

        {results !== null && (
          <div className="results">
            <h3>Resultados de demostración</h3>
            {results.length === 0 ? <p>No hay vuelos de ejemplo para esta ruta.</p> :
              results.map((f, i) => (
                <article className="flight-result" key={i}>
                  <Plane />
                  <strong>{f.from} → {f.to}</strong>
                  <span>{f.time} – {f.arrival}</span>
                  <strong>{f.price} €</strong>
                </article>
              ))
            }
          </div>
        )}
      </section>

      <section className="benefits">
        <article><Globe2 /><h3>El mundo te espera</h3><p>Descubre nuevos destinos.</p></article>
        <article><ShieldCheck /><h3>Tu cuenta, protegida</h3><p>Tus búsquedas son privadas.</p></article>
        <article><Sparkles /><h3>Viaja con distinción</h3><p>Cuida cada detalle de tu viaje.</p></article>
      </section>

      <section className="history" id="historial">
        <span className="eyebrow">TU ACTIVIDAD</span>
        <h2>Mis últimas búsquedas</h2>
        {history.length === 0 ? <p>Aún no tienes búsquedas guardadas.</p> :
          history.map(s => (
            <article className="history-row" key={s.id}>
              <Plane />
              <strong>{s.origin} → {s.destination}</strong>
              <span>{s.departure_date}</span>
              <span><Users size={14} /> {s.passengers}</span>
            </article>
          ))
        }
      </section>

      <footer className="footer">
        <strong>MEJIA AIRLINE</strong>
        <span>THE ART OF TRAVEL · Los mejores vuelos</span>
      </footer>
    </main>
  );
}
