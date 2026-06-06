import { createRouter, createWebHistory } from 'vue-router'

import HomeView from '../views/HomeView.vue'

const routes = [
	{
		path: '/backoffice',
		redirect: '/'
	},
	{
		path: '/frontoffice',
		redirect: '/'
	},
	{
		path: '/',
		name: 'home',
		component: HomeView
	}
]

const router = createRouter({
	history: createWebHistory(),
	routes
})

export default router
