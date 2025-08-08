// @ts-check
import { defineConfig } from 'astro/config'
import vue from '@astrojs/vue'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://uview-plus-free.vercel.app/',
  integrations: [vue(), sitemap()]
})