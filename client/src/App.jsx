import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import AdminLayout from './layouts/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import DashboardContent from './pages/admin/DashboardContent'
import ConfigForm from './pages/admin/ConfigForm'
import Salesmen from './pages/admin/Salesmen'
import StockUpload from './pages/admin/StockUpload'
import StockCheck from './pages/admin/StockCheck'
import Logs from './pages/admin/Logs'
import Profile from './pages/admin/Profile'
import SalesmanLayout from './layouts/SalesmanLayout'
import SalesmanDashboard from './pages/salesman/Dashboard'
import ItemSearch from './pages/salesman/ItemSearch'
import ItemDetail from './pages/ItemDetail'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="dashboard-content" element={<DashboardContent />} />
        <Route path="config" element={<ConfigForm />} />
        <Route path="salesmen" element={<Salesmen />} />
        <Route path="stock-upload" element={<StockUpload />} />
        <Route path="stock-check" element={<StockCheck />} />
        <Route
          path="stock-check/item/:code"
          element={<ItemDetail backPath="/admin/stock-check" showFullDetails />}
        />
        <Route path="logs" element={<Logs />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="/salesman" element={<SalesmanLayout />}>
        <Route index element={<SalesmanDashboard />} />
        <Route path="search" element={<ItemSearch />} />
        <Route path="item/:code" element={<ItemDetail backPath="/salesman/search" showFullDetails />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
