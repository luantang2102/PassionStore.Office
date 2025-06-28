import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { Category } from "../../app/models/responses/category";
import { formatVND } from "./utils";

interface Product {
  id: string;
  name: string;
  description: string;
  inStock: boolean;
  isFeatured: boolean;
  brand: { id: string; name: string; description?: string };
  categories: { id: string; name: string; subCategories: Category[] }[];
  productImages: { id: string; imageUrl: string; isMain: boolean }[];
  productVariants: ProductVariant[];
  minPrice: number;
  maxPrice: number;
  averageRating: number;
}

interface ProductVariant {
  id: string;
  price: number;
  stockQuantity: number;
  color: { id: string; name: string };
  size: { id: string; name: string };
  images: { id: string; imageUrl: string; isMain: boolean }[];
}

interface VariantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export const VariantDialog = ({ open, onOpenChange, product }: VariantDialogProps) => {
  if (!product) return null;

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: "Out of Stock", variant: "error" as const };
    if (stock < 10) return { label: "Low Stock", variant: "warning" as const };
    return { label: "In Stock", variant: "success" as const };
  };

  return (
    <Dialog open={open} onClose={() => onOpenChange(false)} fullWidth maxWidth="lg">
      <DialogTitle>Product Variants - {product.name}</DialogTitle>
      <DialogContent>
        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Variant Name</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Stock</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Color</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {product.productVariants.map((variant: ProductVariant) => {
                const stockStatus = getStockStatus(variant.stockQuantity);
                const variantName = `${variant.size.name} - ${variant.color.name}`;
                return (
                  <TableRow key={variant.id}>
                    <TableCell>{variantName}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace" }}>{variant.id}</TableCell>
                    <TableCell>{formatVND(variant.price)}</TableCell>
                    <TableCell>{variant.stockQuantity}</TableCell>
                    <TableCell>
                      <Chip
                        label={stockStatus.label}
                        size="small"
                        color={stockStatus.variant}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{variant.size.name}</TableCell>
                    <TableCell>{variant.color.name}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Box
          sx={{
            mt: 4,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 2,
            p: 2,
            bgcolor: "grey.100",
            borderRadius: 1,
          }}
        >
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h6">{product.productVariants.length}</Typography>
            <Typography variant="body2" color="textSecondary">
              Total Variants
            </Typography>
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h6">
              {product.productVariants.reduce((sum: number, v: ProductVariant) => sum + v.stockQuantity, 0)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Total Stock
            </Typography>
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h6">
              {formatVND(product.minPrice)} - {formatVND(product.maxPrice)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Price Range
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onOpenChange(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};