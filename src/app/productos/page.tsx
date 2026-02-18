"use client"

import { useMemo, useState } from "react"

const CATEGORIES = [
  "Todas",
  "Gafas Graduadas",
  "Gafas de Sol",
  "Lentillas",
  "Accesorios",
] as const

type Category = (typeof CATEGORIES)[number]

type Product = {
  id: string
  name: string
  description: string
  category: Category
  highlight?: string
}

const PRODUCTS: Product[] = [
  {
    id: "elegance",
    name: "Gafas de Sol Elegance Clásica",
    description: "Montura ligera de acetato con filtro UV400 y bisagras reforzadas para uso diario.",
    category: "Gafas de Sol",
    highlight: "Popular",
  },
  {
    id: "montreal",
    name: "Gafas Graduadas Montreal",
    description: "Estilo atemporal con varillas flexibles y opción de lentes blue light sin coste extra.",
    category: "Gafas Graduadas",
  },
  {
    id: "daily-vision",
    name: "Lentillas Daily Vision",
    description: "Caja de 30 unidades con humectación avanzada para comodidad durante toda la jornada.",
    category: "Lentillas",
  },
  {
    id: "limpieza",
    name: "Kit de Limpieza Premium",
    description: "Solución antibacteriana, gamuza de microfibra y spray anti vaho para tus gafas.",
    category: "Accesorios",
  },
]

export default function ProductCatalogPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("Todas")

  const filteredProducts = useMemo(() => {
    if (activeCategory === "Todas") {
      return PRODUCTS
    }

    return PRODUCTS.filter((product) => product.category === activeCategory)
  }, [activeCategory])

  return (
    <main className="mx-auto max-w-5xl px-6 pb-16 pt-12 text-slate-50">
      <header className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-indigo-300">Productos</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Nuestro Catálogo</h1>
        <p className="mt-3 max-w-2xl text-base text-slate-300">
          Explora las colecciones más buscadas de la óptica. Cambia de categoría para ver todo lo que tenemos listo para ti.
        </p>
      </header>

      <section>
        <div className="mb-6 flex flex-wrap gap-3">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                activeCategory === category
                  ? "border-indigo-400 bg-indigo-500/20 text-indigo-100"
                  : "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-indigo-400"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {filteredProducts.map((product) => (
            <article
              key={product.id}
              className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-indigo-900/20"
            >
              {product.highlight ? (
                <span className="absolute right-4 top-4 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-indigo-100">
                  {product.highlight}
                </span>
              ) : null}
              <div className="mb-4 h-36 rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-900/50" />
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200">{product.category}</p>
              <h2 className="mt-2 text-xl font-bold text-white">{product.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{product.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-xl font-semibold text-white">¿Dudas o pedidos especiales?</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Puedes escribirnos directamente a{" "}
          <a className="font-semibold text-indigo-300 underline" href="mailto:contacto@opticasupershift.com">
            contacto@opticasupershift.com
          </a>
          . Sin formularios ni pasos extra: envía tu consulta y te respondemos por correo.
        </p>
      </section>
    </main>
  )
}
