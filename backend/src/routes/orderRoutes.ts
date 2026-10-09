import { Router } from 'express';
import {
  getOrders,
  getOrderById,
  getOrderPDF,
  sendOrderWhatsAppPDF,
  getPublicOrderByNumber,
  createOrder,
  updateOrder,
  updateOrderStatus,
  recordOrderPayment,
  deleteOrder,
  fixOrder412,
} from '../controllers/orderController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Public routes for customer digital receipt access
router.get('/public-receipt', getPublicOrderByNumber);
router.get('/public/:orderNumber', getPublicOrderByNumber);
router.get('/public/*', getPublicOrderByNumber);

// Protected routes (Admin Auth required)
router.use(authMiddleware);

router.post('/fix-order-412', fixOrder412);
router.get('/', getOrders);
router.get('/:id', getOrderById);
router.get('/:id/pdf', getOrderPDF);
router.post('/:id/send-whatsapp-pdf', sendOrderWhatsAppPDF);
router.post('/', createOrder);
router.put('/:id', updateOrder);
router.patch('/:id/status', updateOrderStatus);
router.post('/:id/payments', recordOrderPayment);
router.delete('/:id', deleteOrder);

export default router;
