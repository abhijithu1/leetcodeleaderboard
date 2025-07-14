"use client";

import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton, useAuth } from "@clerk/nextjs";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FaGithub, FaTwitter, FaLinkedin } from "react-icons/fa";
import CountUp from "react-countup";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

const testimonials = [
  {
    name: "Alice",
    text: "This leaderboard made our coding club so much more fun! The charts are beautiful and the public sharing is a game changer.",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
  },
  {
    name: "Bob",
    text: "Super easy to use, and the analytics are top-notch. Our group loves the real-time stats!",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
  },
  {
    name: "Priya",
    text: "The best LeetCode group tool out there. The UI is gorgeous and the experience is seamless.",
    avatar: "https://randomuser.me/api/portraits/women/68.jpg",
  },
];

const stats = [
  { label: "Groups Created", value: 1287 },
  { label: "Problems Tracked", value: 45231 },
  { label: "Active Users", value: 3892 },
];

export default function Home() {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) {
      router.replace("/dashboard");
    }
  }, [isSignedIn, router]);

  return (
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-br from-indigo-100 via-white to-orange-100 relative overflow-x-hidden">
      {/* Animated background shapes */}
      <motion.div
        className="absolute top-0 left-0 w-[600px] h-[600px] bg-indigo-200 rounded-full blur-3xl opacity-40 -z-10"
        animate={{ scale: [1, 1.1, 1], rotate: [0, 30, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-orange-200 rounded-full blur-3xl opacity-40 -z-10"
        animate={{ scale: [1, 1.05, 1], rotate: [0, -20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Navbar */}
      <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16 bg-white/80 backdrop-blur sticky top-0 z-10 shadow-sm">
        <div className="w-full max-w-6xl flex justify-between items-center p-3 px-5 text-sm">
          <motion.div
            className="flex gap-4 items-center font-bold text-2xl md:text-3xl text-indigo-700"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Link href="/">LeetCode Leaderboard</Link>
          </motion.div>
          <div className="flex gap-4 items-center">
            <SignedOut>
              <SignInButton mode="modal">
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.96 }}
                  className="px-4 py-2 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition shadow-lg"
                >
                  Sign In
                </motion.button>
              </SignInButton>
              <SignUpButton mode="modal">
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.96 }}
                  className="px-4 py-2 rounded bg-orange-500 text-white font-semibold hover:bg-orange-600 transition shadow-lg"
                >
                  Sign Up
                </motion.button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <ThemeSwitcher />
          </div>
        </div>
      </nav>
      {/* Hero Section */}
      <section className="flex-1 w-full flex flex-col items-center justify-center py-24 px-4">
        <motion.div
          className="max-w-3xl text-center"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight bg-gradient-to-r from-indigo-600 via-orange-500 to-pink-500 bg-clip-text text-transparent animate-gradient-move">
            Visualize Your <span className="drop-shadow-lg">LeetCode</span> Group's Progress
          </h1>
          <p className="text-lg md:text-2xl text-gray-700 mb-8 animate-fade-in">
            Effortlessly create leaderboards, upload group member lists, and compare LeetCode stats with beautiful analytics. Perfect for coding clubs, classrooms, and competitive friends!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <SignUpButton mode="modal">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 rounded-lg bg-orange-500 text-white font-bold text-lg shadow-xl hover:bg-orange-600 transition"
              >
                Get Started Free
              </motion.button>
            </SignUpButton>
            <SignInButton mode="modal">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 rounded-lg bg-indigo-600 text-white font-bold text-lg shadow-xl hover:bg-indigo-700 transition"
              >
                Sign In
              </motion.button>
            </SignInButton>
          </div>
        </motion.div>
        {/* Animated Feature Cards */}
        <motion.div
          className="max-w-4xl w-full mt-12 grid grid-cols-1 md:grid-cols-3 gap-8"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.2 } },
          }}
        >
          {[
            {
              icon: "📊",
              title: "Interactive Leaderboards",
              desc: "Upload your group, fetch real-time LeetCode stats, and see who's on top with sortable, beautiful tables.",
            },
            {
              icon: "📈",
              title: "Advanced Analytics",
              desc: "Visualize progress with charts: problems solved, contest ratings, submission activity, and more.",
            },
            {
              icon: "🔗",
              title: "Shareable & Secure",
              desc: "Share your leaderboard with a public link, or keep it private for your group. Your data stays secure.",
            },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              className="bg-white rounded-xl shadow-xl p-6 flex flex-col items-center hover:scale-105 transition-transform cursor-pointer border border-indigo-100"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.2 }}
              whileHover={{ scale: 1.07 }}
            >
              <span className="text-4xl mb-2 animate-bounce-slow">{f.icon}</span>
              <h3 className="font-bold text-lg mb-1 text-indigo-700">{f.title}</h3>
              <p className="text-gray-600 text-center">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
        {/* Animated Stats Counters */}
        <motion.div
          className="max-w-4xl w-full mt-16 grid grid-cols-1 md:grid-cols-3 gap-8"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.2 } },
          }}
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="bg-gradient-to-br from-indigo-200 via-white to-orange-200 rounded-xl shadow-lg p-8 flex flex-col items-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 + i * 0.2 }}
            >
              <span className="text-4xl font-extrabold text-indigo-700">
                <CountUp end={stat.value} duration={2} separator="," />
              </span>
              <span className="text-lg text-gray-700 mt-2 font-semibold">{stat.label}</span>
            </motion.div>
          ))}
        </motion.div>
        {/* Testimonial Carousel */}
        <motion.div
          className="max-w-2xl w-full mt-20"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.7 }}
        >
          <Swiper
            spaceBetween={30}
            slidesPerView={1}
            loop
            autoplay={{ delay: 4000 }}
            className="rounded-xl shadow-lg bg-white p-8"
          >
            {testimonials.map((t) => (
              <SwiperSlide key={t.name}>
                <div className="flex flex-col items-center gap-4">
                  <img src={t.avatar} alt={t.name} className="w-16 h-16 rounded-full shadow" />
                  <p className="text-lg text-gray-700 italic">“{t.text}”</p>
                  <span className="font-bold text-indigo-700">{t.name}</span>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </motion.div>
      </section>
      {/* Footer */}
      <footer className="w-full flex flex-col items-center justify-center border-t mx-auto text-center text-xs gap-4 py-10 bg-white/80 mt-16">
        <div className="flex gap-6 justify-center mb-2">
          <a href="https://github.com/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-indigo-600 transition text-xl"><FaGithub /></a>
          <a href="https://twitter.com/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-400 transition text-xl"><FaTwitter /></a>
          <a href="https://linkedin.com/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-700 transition text-xl"><FaLinkedin /></a>
        </div>
        <p>
          &copy; {new Date().getFullYear()} LeetCode Leaderboard. Not affiliated with LeetCode. | Built with Next.js, Clerk, and Supabase.
        </p>
      </footer>
      <style jsx global>{`
        .animate-gradient-move {
          background-size: 200% 200%;
          animation: gradient-move 6s ease-in-out infinite;
        }
        @keyframes gradient-move {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-fade-in {
          animation: fade-in 1.2s ease-in;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2.5s infinite;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </main>
  );
}
