import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from '../components/Layout'
import HomeView from '../views/HomeView'
import SumaEnterosView from '../views/SumaEnterosView'
import FraccionesView from '../views/FraccionesView'
import DecimalesView from '../views/DecimalesView'
import PorcentajesView from '../views/PorcentajesView'
import RestaEnterosView from '../views/RestaEnterosView'

const router = createBrowserRouter([
    {
        path: '/',
        element: <Layout><HomeView /></Layout>
    },
    {
        path: '/suma-enteros',
        element: <Layout><SumaEnterosView /></Layout>
    },
    {
        path: '/resta-enteros',
        element: <Layout><RestaEnterosView /></Layout>
    },
    {
        path: '/fracciones',
        element: <Layout><FraccionesView /></Layout>
    },
    {
        path: '/decimales',
        element: <Layout><DecimalesView /></Layout>
    },
    {
        path: '/porcentajes',
        element: <Layout><PorcentajesView /></Layout>
    }
])

export default function AppRouter() {
    return <RouterProvider router={router} />
}
