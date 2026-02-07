import { Link } from 'react-router-dom'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">BeardForce CRM</h1>
          <div className="flex gap-4">
            <Link to="/leads" className="text-blue-600 hover:underline">
              Leads
            </Link>
            <Link to="/contacts" className="text-blue-600 hover:underline">
              Contacts
            </Link>
            <Link to="/it-agent" className="text-blue-600 hover:underline">
              🔧 IT Manager
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-8">
        <div className="grid grid-cols-3 gap-6">
          {/* Dashboard stats */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Total Leads</h3>
            <p className="text-3xl font-bold">0</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Contacts</h3>
            <p className="text-3xl font-bold">0</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Open Opportunities</h3>
            <p className="text-3xl font-bold">0</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/it-agent" className="p-4 border-2 border-blue-600 rounded-lg hover:bg-blue-50">
              <div className="text-2xl mb-2">🔧</div>
              <h3 className="font-semibold">IT Manager Agent</h3>
              <p className="text-sm text-gray-600">Manage database and schemas</p>
            </Link>
            
            <button className="p-4 border-2 border-gray-300 rounded-lg hover:bg-gray-50">
              <div className="text-2xl mb-2">📊</div>
              <h3 className="font-semibold">Marketing Agent</h3>
              <p className="text-sm text-gray-600">Coming in Phase 3</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}