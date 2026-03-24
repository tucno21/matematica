import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from '../components/Layout'
import HomeView from '../views/HomeView'
import SumaRestaEnterosView from '../views/SumaRestaEnterosView'
import FraccionesView from '../views/FraccionesView'
import DecimalesView from '../views/DecimalesView'
import PorcentajesView from '../views/PorcentajesView'

const router = createBrowserRouter([
    {
        path: '/',
        element: <Layout><HomeView /></Layout>
    },
    {
        path: '/suma-resta-enteros',
        element: <Layout><SumaRestaEnterosView /></Layout>
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
