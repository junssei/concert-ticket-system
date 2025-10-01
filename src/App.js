import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Reserve from './pages/Reserve';
import SeatSelect from './pages/SeatSelect';
import Checkout from './pages/Checkout';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import EventDetails from './pages/EventDetails';
import MyReservations from './pages/MyReservations';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/event/:id" element={<EventDetails />} />
      <Route
        path="/reserve/:id/seat"
        element={
          <ProtectedRoute>
            <SeatSelect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reserve/:id"
        element={
          <ProtectedRoute>
            <Reserve />
          </ProtectedRoute>
        }
      />
      <Route
        path="/checkout"
        element={
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/me/reservations"
        element={
          <ProtectedRoute>
            <MyReservations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
    </Routes>
  );
}
