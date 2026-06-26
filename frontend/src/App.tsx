function App() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-paper)' }}>
      <div
        className="text-center p-8 rounded-[14px]"
        style={{ boxShadow: 'var(--shadow-card)', background: 'white', maxWidth: 480 }}
      >
        <h1
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--color-blue)' }}
        >
          Venturizer
        </h1>
        <p style={{ color: 'var(--color-caption)', fontFamily: "'IBM Plex Sans', sans-serif" }}>
          Frontend scaffold — chatbot UI coming next.
        </p>
      </div>
    </div>
  )
}

export default App
