import Nav from '../components/Nav';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Nav />

      {/* Hero */}
      <section className="px-6 py-16 text-center max-w-3xl mx-auto">
        <div className="text-yellow-400 text-xs font-bold tracking-widest uppercase mb-3">Est. 2008 · Gwangju, South Korea</div>
        <h1 className="text-4xl font-black mb-4">Crafted in Korea.<br />Built for the World.</h1>
        <p className="text-gray-400 text-lg">17 years of baseball glove craftsmanship — now direct to players worldwide.</p>
      </section>

      {/* Stats */}
      <section className="px-6 pb-12 max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { value: '17+', label: 'Years Experience' },
          { value: '2008', label: 'Founded in Korea' },
          { value: '2018', label: 'Own Factory' },
          { value: '$169', label: 'All-Inclusive Price' },
        ].map((stat) => (
          <div key={stat.label} className="bg-gray-900 rounded-xl p-5 text-center">
            <div className="text-yellow-400 text-2xl font-black mb-1">{stat.value}</div>
            <div className="text-gray-400 text-xs">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Our Story */}
      <section className="px-6 pb-12 max-w-3xl mx-auto">
        <h2 className="text-2xl font-black mb-4 text-yellow-400">Our Story</h2>
        <div className="bg-gray-900 rounded-xl p-6 space-y-4 text-gray-300 leading-relaxed">
          <p>
            RAON Sports was founded in 2008 in Gwangju, South Korea. For over 17 years, we have been manufacturing and distributing baseball equipment — supplying OEM orders for American and global brands from our own production facility in Xiamen, China.
          </p>
          <p>
            In 2018, we established <span className="text-white font-semibold">RAON (Xiamen) Sports Goods Co., Ltd</span> — giving us full control over quality, materials, and production timelines. No middlemen. No compromises.
          </p>
          <p>
            GN Glove is our direct-to-player brand. We cut out the middlemen and bring factory-quality custom gloves straight to you — at a flat <span className="text-yellow-400 font-bold">$169, delivered in 30 days.</span>
          </p>
        </div>
      </section>

      {/* Why GN */}
      <section className="px-6 pb-12 max-w-3xl mx-auto">
        <h2 className="text-2xl font-black mb-4 text-yellow-400">Why GN Glove?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { icon: '🏭', title: 'Own Factory', desc: 'We manufacture every glove in our own Xiamen facility. No outsourcing.' },
            { icon: '🧤', title: 'Photo-Based Custom', desc: 'Send us a photo. We build it. No click-and-configure gimmicks.' },
            { icon: '💰', title: 'Flat $169', desc: 'Everything included. Colors, embroidery, flags. No add-on fees ever.' },
            { icon: '📦', title: '30-Day Delivery', desc: 'From order confirmation to your door — guaranteed in 30 days.' },
            { icon: '🌍', title: 'Global Shipping', desc: 'We ship worldwide. USA, Korea, Japan, Brazil and beyond.' },
            { icon: '⭐', title: '17 Years of Craft', desc: 'Built by craftsmen who have been making gloves for nearly two decades.' },
          ].map((item) => (
            <div key={item.title} className="bg-gray-900 rounded-xl p-5 flex gap-4">
              <div className="text-2xl">{item.icon}</div>
              <div>
                <div className="font-bold text-white mb-1">{item.title}</div>
                <div className="text-gray-400 text-sm">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-16 max-w-3xl mx-auto text-center">
        <div className="bg-yellow-400 rounded-2xl p-8">
          <h2 className="text-2xl font-black text-black mb-2">Ready to build your glove?</h2>
          <p className="text-gray-800 mb-6">$169 flat. 30-day delivery. Your design, your way.</p>
          <Link href="/" className="bg-black text-yellow-400 font-bold px-8 py-3 rounded-xl hover:bg-gray-900 inline-block">
            Start Designing →
          </Link>
        </div>
      </section>
    </div>
  );
}