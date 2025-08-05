/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  Typography,
  Paper,
  Chip,
  Rating,
  IconButton,
  InputAdornment,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Grid,
  CircularProgress,
  Alert,
  Snackbar,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Popover,
  Button,
  Checkbox,
  SelectChangeEvent,
} from "@mui/material";
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AddCircle as AddCircleIcon,
  Refresh as RefreshIcon,
  Inventory as InventoryIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Upload as UploadIcon,
  ContentCopy as ContentCopyIcon,
  ExpandMore as ExpandMoreIcon,
  Clear as ClearIcon,
  RemoveRedEye as EyeIcon,
} from "@mui/icons-material";
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { setParams, setPageNumber, setCreateFormOpen, setSelectedProductId, setDeleteDialogOpen } from "./productsSlice";
import { useAppDispatch, useAppSelector } from "../../app/store/store";
import {
  useFetchProductsQuery,
  useFetchProductByIdQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} from "../../app/api/productApi";
import {
  useCreateProductVariantMutation,
  useUpdateProductVariantMutation,
  useDeleteProductVariantMutation,
} from "../../app/api/productVariantApi";
import { useFetchCategoriesTreeQuery } from "../../app/api/categoryApi";
import { useFetchBrandsTreeQuery } from "../../app/api/brandApi";
import { useFetchColorsTreeQuery } from "../../app/api/colorApi";
import { useFetchSizesTreeQuery } from "../../app/api/sizeApi";
import { Category } from "../../app/models/responses/category";
import { debounce } from "lodash";
import { Brand } from "../../app/models/responses/brand";
import { Color } from "../../app/models/responses/color";
import { Size } from "../../app/models/responses/size";
import { PaginationParams } from "../../app/models/params/pagination";

interface Product {
  id: string;
  name: string;
  description: string;
  inStock: boolean;
  isFeatured: boolean;
  brand: { id: string; name: string; description?: string };
  categories: { id: string; name: string; subCategories: Category[] }[];
  productImages: { id: string; imageUrl: string }[];
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
}

interface ProductRequest {
  name: string;
  description: string;
  inStock: boolean;
  isFeatured: boolean;
  brandId: string;
  categoryIds: string[];
  formImages: File[];
  existingImages: { id: string }[];
  isNotHadVariants: boolean;
  defaultVariantPrice: number;
  defaultVariantStockQuantity: number;
}

interface ProductVariantRequest {
  id?: string;
  price: number;
  stockQuantity: number;
  colorId: string;
  sizeId: string;
}

interface FormState {
  formData: ProductRequest;
  selectedCategoryIds: { id: string; name: string }[];
  productVariants: ProductVariantRequest[];
  deletedImageIds: string[];
  deletedVariantIds: string[];
  errors: {
    name?: string;
    description?: string;
    brandId?: string;
    formImages?: string;
    existingImages?: string;
    variants?: string;
    defaultVariantPrice?: string;
    defaultVariantStockQuantity?: string;
  };
  newVariantForm: ProductVariantRequest;
  variantErrors: {
    sizeId?: string;
    colorId?: string;
    price?: string;
    stockQuantity?: string;
  };
}

interface CategoryMenuProps {
  categories: Category[];
  depth: number;
  selectedCategoryIds: { id: string; name: string }[];
  onSelect: (categoryId: string, categoryName: string) => void;
}

interface SortableImageProps {
  id: string;
  src: string;
  alt: string;
  onDelete: () => void;
}

interface VariantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

const CategoryMenu = ({ categories, depth, selectedCategoryIds, onSelect }: CategoryMenuProps) => {
  const [openMenus, setOpenMenus] = useState<{ [key: string]: HTMLElement | null }>({});

  const toggleMenu = (categoryId: string, anchorEl: HTMLElement | null) => {
    setOpenMenus((prev) => ({
      ...prev,
      [categoryId]: anchorEl,
    }));
  };

  const closeMenu = (categoryId: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [categoryId]: null,
    }));
  };

  return (
    <>
      {categories.map((category) => {
        const hasChildren = category.subCategories && category.subCategories.length > 0;
        const isLeaf = !hasChildren;
        const isSelected = selectedCategoryIds.some((item) => item.id === category.id);

        return (
          <Box key={category.id}>
            <MenuItem
              sx={{
                pl: 2 + depth * 2,
                color: isLeaf ? "text.primary" : "text.secondary",
                fontStyle: isLeaf ? "normal" : "italic",
                backgroundColor: isSelected ? "action.selected" : "inherit",
              }}
              selected={isSelected}
              onClick={(e) => {
                if (isLeaf) {
                  onSelect(category.id, category.name);
                } else {
                  toggleMenu(category.id, e.currentTarget);
                }
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
                <Typography>{category.name}</Typography>
                {hasChildren && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMenu(category.id, e.currentTarget);
                    }}
                    sx={{ ml: "auto" }}
                  >
                    <ExpandMoreIcon
                      sx={{
                        transform: openMenus[category.id] ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s",
                      }}
                    />
                  </IconButton>
                )}
              </Box>
            </MenuItem>
            {hasChildren && (
              <Popover
                open={Boolean(openMenus[category.id])}
                anchorEl={openMenus[category.id]}
                onClose={() => closeMenu(category.id)}
                anchorOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                transformOrigin={{
                  vertical: "top",
                  horizontal: "left",
                }}
                PaperProps={{
                  sx: { minWidth: 200 },
                }}
              >
                <CategoryMenu
                  categories={category.subCategories}
                  depth={depth + 1}
                  selectedCategoryIds={selectedCategoryIds}
                  onSelect={onSelect}
                />
              </Popover>
            )}
          </Box>
        );
      })}
    </>
  );
};

const VariantDialog = ({ open, onOpenChange, product }: VariantDialogProps) => {
  if (!product) return null;

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: "Out of Stock", variant: "error" as const };
    if (stock < 10) return { label: "Low Stock", variant: "warning" as const };
    return { label: "In Stock", variant: "success" as const };
  };

  const formatVND = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(price);
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

const formatVND = (price: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(price);
};

const SortableImage = ({ id, src, alt, onDelete }: SortableImageProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: "relative" as const,
  };

  const dragHandleProps = {
    ...listeners,
    ...attributes,
    style: { cursor: "move" },
  };

  return (
    <Box ref={setNodeRef} style={style} sx={{ position: "relative" }}>
      <Box
        component="img"
        src={src}
        alt={alt}
        sx={{
          width: 80,
          height: 80,
          objectFit: "cover",
          borderRadius: 1,
          userSelect: "none",
        }}
        {...dragHandleProps}
      />
      <IconButton
        size="small"
        color="error"
        onClick={onDelete}
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          backgroundColor: "rgba(255, 255, 255, 0.7)",
          zIndex: 10,
        }}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Box>
  );
};

export default function ProductList() {
  const dispatch = useAppDispatch();
  const { params, selectedProductId, isCreateFormOpen, isDeleteDialogOpen } = useAppSelector(
    (state) => state.product
  );
  const { data, isLoading, error, refetch, isFetching } = useFetchProductsQuery(params);
  const [search, setSearch] = useState(params.searchTerm || "");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [viewingVariants, setViewingVariants] = useState<Product | null>(null);
  const [imageDeleteDialogOpen, setImageDeleteDialogOpen] = useState(false);
  const [confirmNoVariantsDialogOpen, setConfirmNoVariantsDialogOpen] = useState(false);
  const [pendingImageDelete, setPendingImageDelete] = useState<{
    type: "uploaded" | "existing";
    index?: number;
    imageId?: string;
  } | null>(null);

  const shouldFetchProduct = selectedProductId && isCreateFormOpen && !isDeleteDialogOpen;
  const { data: selectedProductData, isLoading: isLoadingProduct, refetch: refetchProduct } = useFetchProductByIdQuery(
    selectedProductId || "",
    { skip: !shouldFetchProduct }
  );

  const selectedProduct = useMemo(() => {
    if (!selectedProductData) return null;
    const defaultVariant = selectedProductData.productVariants.find(
      (v: ProductVariant) => v.color.name === "None" && v.size.name === "None"
    );
    const isNotHadVariants = defaultVariant && selectedProductData.productVariants.length === 1;
    return {
      ...selectedProductData,
      categories: selectedProductData.categories || [],
      productImages: selectedProductData.productImages || [],
      productVariants: selectedProductData.productVariants || [],
      brand: selectedProductData.brand || { id: "", name: "" },
      isNotHadVariants,
      defaultVariantPrice: defaultVariant?.price || 0,
      defaultVariantStockQuantity: defaultVariant?.stockQuantity || 0,
    };
  }, [selectedProductData]);

  const { data: categoriesData, isLoading: isLoadingCategories } = useFetchCategoriesTreeQuery();
  const { data: brandsData, isLoading: isLoadingBrands } = useFetchBrandsTreeQuery();
  const { data: sizesData, isLoading: isLoadingSizes } = useFetchSizesTreeQuery();
  const { data: colorsData, isLoading: isLoadingColors } = useFetchColorsTreeQuery();

  const [createProduct, { isLoading: isCreatingProduct }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdatingProduct }] = useUpdateProductMutation();
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();
  const [createProductVariant, { isLoading: isCreatingVariant }] = useCreateProductVariantMutation();
  const [updateProductVariant, { isLoading: isUpdatingVariant }] = useUpdateProductVariantMutation();
  const [deleteProductVariant, { isLoading: isDeletingVariant }] = useDeleteProductVariantMutation();

  const [formState, setFormState] = useState<FormState>({
    formData: {
      name: "",
      description: "",
      inStock: true,
      isFeatured: false,
      brandId: "",
      categoryIds: [],
      formImages: [],
      existingImages: [],
      isNotHadVariants: true,
      defaultVariantPrice: 0,
      defaultVariantStockQuantity: 0,
    },
    selectedCategoryIds: [],
    productVariants: [],
    deletedImageIds: [],
    deletedVariantIds: [],
    errors: {},
    newVariantForm: {
      price: 0,
      stockQuantity: 0,
      colorId: "",
      sizeId: "",
    },
    variantErrors: {},
  });

  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning",
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  useEffect(() => {
    const urls = formState.formData.formImages.map((file) => URL.createObjectURL(file));
    setPreviewUrls((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return urls;
    });
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [formState.formData.formImages]);

  useEffect(() => {
    if (!isCreateFormOpen || !shouldFetchProduct || !selectedProduct) {
      return;
    }

    const newFormState: FormState = {
      formData: {
        name: selectedProduct.name || "",
        description: selectedProduct.description || "",
        inStock: selectedProduct.inStock ?? true,
        isFeatured: selectedProduct.isFeatured ?? false,
        brandId: selectedProduct.brand?.id || "",
        categoryIds: selectedProduct.categories.map((c) => c.id) || [],
        formImages: [],
        existingImages: selectedProduct.productImages.map((img) => ({ id: img.id })) || [],
        isNotHadVariants: selectedProduct.isNotHadVariants ?? false,
        defaultVariantPrice: selectedProduct.defaultVariantPrice || 0,
        defaultVariantStockQuantity: selectedProduct.defaultVariantStockQuantity || 0,
      },
      selectedCategoryIds: selectedProduct.categories.map((c) => ({ id: c.id, name: c.name })) || [],
      productVariants: selectedProduct.productVariants
        .filter((v: ProductVariant) => v.color.name !== "None" || v.size.name !== "None")
        .map((v: ProductVariant) => ({
          id: v.id,
          price: v.price || 0,
          stockQuantity: v.stockQuantity || 0,
          colorId: v.color?.id || "",
          sizeId: v.size?.id || "",
        })) || [],
      deletedImageIds: [],
      deletedVariantIds: [],
      errors: {},
      newVariantForm: {
        price: 0,
        stockQuantity: 0,
        colorId: "",
        sizeId: "",
      },
      variantErrors: {},
    };

    setFormState(newFormState);
  }, [isCreateFormOpen, shouldFetchProduct, selectedProduct]);

  useEffect(() => {
    if (isCreateFormOpen && !selectedProductId) {
      setFormState({
        formData: {
          name: "",
          description: "",
          inStock: true,
          isFeatured: false,
          brandId: "",
          categoryIds: [],
          formImages: [],
          existingImages: [],
          isNotHadVariants: true,
          defaultVariantPrice: 0,
          defaultVariantStockQuantity: 0,
        },
        selectedCategoryIds: [],
        productVariants: [],
        deletedImageIds: [],
        deletedVariantIds: [],
        errors: {},
        newVariantForm: {
          price: 0,
          stockQuantity: 0,
          colorId: "",
          sizeId: "",
        },
        variantErrors: {},
      });
    }
  }, [isCreateFormOpen, selectedProductId]);

  useEffect(() => {
    if (search !== params.searchTerm) {
      setSearch(params.searchTerm || "");
    }
  }, [params.searchTerm, search]);

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      dispatch(setParams({ searchTerm: value.trim() || undefined }));
      dispatch(setPageNumber(1));
    }, 500),
    [dispatch]
  );

  const validateForm = () => {
    const newErrors: FormState["errors"] = {};

    if (!formState.formData.name?.trim()) {
      newErrors.name = "Product name is required.";
    }

    if (!formState.formData.description?.trim()) {
      newErrors.description = "Product description is required.";
    }

    if (!formState.formData.brandId) {
      newErrors.brandId = "Brand is required.";
    }

    if (formState.formData.formImages.length > 0) {
      const maxSize = 5 * 1024 * 1024;
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"];
      if (formState.formData.formImages.some((file) => file.size === 0)) {
        newErrors.formImages = "All uploaded images must have content.";
      } else if (formState.formData.formImages.some((file) => file.size > maxSize)) {
        newErrors.formImages = "Each image must be less than 5 MB.";
      } else if (formState.formData.formImages.some((file) => !allowedTypes.includes(file.type))) {
        newErrors.formImages = "Only JPEG, PNG, WEBP, AVIF and GIF images are allowed.";
      }
    }

    if (selectedProductId && formState.formData.existingImages.length > 0) {
      if (formState.formData.existingImages.some((image) => !image.id)) {
        newErrors.existingImages = "All existing images must have a valid ID.";
      }
    }

    if (formState.formData.isNotHadVariants) {
      if (formState.formData.defaultVariantPrice <= 0) {
        newErrors.defaultVariantPrice = "Price must be greater than 0.";
      }
      if (formState.formData.defaultVariantStockQuantity < 0) {
        newErrors.defaultVariantStockQuantity = "Stock quantity cannot be negative.";
      }
    } else if (formState.productVariants.length === 0) {
      newErrors.variants = "At least one variant is required.";
    }

    setFormState((prev) => ({ ...prev, errors: newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const validateVariantForm = (variant: ProductVariantRequest) => {
    const newErrors: FormState["variantErrors"] = {};

    if (!variant.sizeId) {
      newErrors.sizeId = "Size is required.";
    }

    if (!variant.colorId) {
      newErrors.colorId = "Color is required.";
    }

    if (variant.price <= 0) {
      newErrors.price = "Price must be greater than 0.";
    }

    if (variant.stockQuantity < 0) {
      newErrors.stockQuantity = "Stock quantity cannot be negative.";
    }

    return newErrors;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({
      ...prev,
      formData: { ...prev.formData, [name]: value },
      errors: { ...prev.errors, [name]: undefined },
    }));
  };

  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;

    // Only show confirmation dialog for isNotHadVariants when switching to true and variants exist
    if (name === "isNotHadVariants" && checked && formState.productVariants.length > 0) {
      setConfirmNoVariantsDialogOpen(true);
      return;
    }

    setFormState((prev) => {
      // Base update for formData
      const updatedFormData = { ...prev.formData, [name]: checked };

      // Only clear productVariants and update deletedVariantIds for isNotHadVariants
      const updatedProductVariants = name === "isNotHadVariants" && checked ? [] : prev.productVariants;
      const updatedDeletedVariantIds =
        name === "isNotHadVariants" && checked
          ? [...prev.deletedVariantIds, ...prev.productVariants.map((v) => v.id || "")]
          : prev.deletedVariantIds;

      return {
        ...prev,
        formData: updatedFormData,
        productVariants: updatedProductVariants,
        deletedVariantIds: updatedDeletedVariantIds,
        errors: { ...prev.errors, variants: undefined },
      };
    });
  };

  const handleConfirmNoVariants = () => {
    setFormState((prev) => ({
      ...prev,
      formData: { ...prev.formData, isNotHadVariants: true },
      productVariants: [],
      deletedVariantIds: [...prev.deletedVariantIds, ...prev.productVariants.map((v) => v.id || "")],
    }));
    setConfirmNoVariantsDialogOpen(false);
  };

  const handleCancelNoVariants = () => {
    setConfirmNoVariantsDialogOpen(false);
  };

  const handlePriceQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericValue = value === "" ? 0 : parseFloat(value);
    setFormState((prev) => ({
      ...prev,
      formData: { ...prev.formData, [name]: numericValue },
      errors: { ...prev.errors, [name]: undefined },
    }));
  };

  const handleCategorySelect = (categoryId: string, categoryName: string) => {
    setFormState((prev) => {
      const isSelected = prev.selectedCategoryIds.some((item) => item.id === categoryId);
      const newCategoryIds = isSelected
        ? prev.selectedCategoryIds.filter((item) => item.id !== categoryId)
        : [...prev.selectedCategoryIds, { id: categoryId, name: categoryName }];
      return {
        ...prev,
        selectedCategoryIds: newCategoryIds,
        formData: {
          ...prev.formData,
          categoryIds: isSelected
            ? prev.formData.categoryIds.filter((id) => id !== categoryId)
            : [...prev.formData.categoryIds, categoryId],
        },
      };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFormState((prev) => ({
        ...prev,
        formData: {
          ...prev.formData,
          formImages: [...prev.formData.formImages, ...newFiles],
        },
        errors: { ...prev.errors, formImages: undefined },
      }));
    }
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    dispatch(setPageNumber(page));
  };

  const handleDeleteUploadedImage = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      formData: { ...prev.formData, formImages: prev.formData.formImages.filter((_, i) => i !== index) },
      errors: { ...prev.errors, formImages: undefined },
    }));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteExistingImage = (imageId: string) => {
    setFormState((prev) => ({
      ...prev,
      deletedImageIds: [...prev.deletedImageIds, imageId],
      formData: { ...prev.formData, existingImages: prev.formData.existingImages.filter((img) => img.id !== imageId) },
      errors: { ...prev.errors, existingImages: undefined },
    }));
  };

  const handleConfirmImageDelete = () => {
    if (!pendingImageDelete) return;
    if (pendingImageDelete.type === "uploaded" && pendingImageDelete.index !== undefined) {
      handleDeleteUploadedImage(pendingImageDelete.index);
    } else if (pendingImageDelete.type === "existing" && pendingImageDelete.imageId) {
      handleDeleteExistingImage(pendingImageDelete.imageId);
    }
    setImageDeleteDialogOpen(false);
    setPendingImageDelete(null);
  };

  const handleCloseImageDeleteDialog = () => {
    setImageDeleteDialogOpen(false);
    setPendingImageDelete(null);
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id).then(() => {
      setNotification({ open: true, message: "Product ID copied successfully", severity: "success" });
    }).catch(() => {
      setNotification({ open: true, message: "Failed to copy ID", severity: "error" });
    });
  };

  const handleBrandChange = (event: SelectChangeEvent<string>) => {
    const brandId = event.target.value as string;
    setFormState((prev) => ({
      ...prev,
      formData: { ...prev.formData, brandId },
      errors: { ...prev.errors, brandId: undefined },
    }));
  };

  const handleVariantInputChange = (e: React.ChangeEvent<HTMLInputElement>, variantIndex?: number) => {
    const { name, value } = e.target;
    const numericValue = value === "" ? 0 : parseFloat(value);
    setFormState((prev) => {
      if (variantIndex !== undefined) {
        return {
          ...prev,
          productVariants: prev.productVariants.map((v, i) =>
            i === variantIndex ? { ...v, [name]: numericValue } : v
          ),
          variantErrors: { ...prev.variantErrors, [name]: undefined },
          errors: { ...prev.errors, variants: undefined },
        };
      } else {
        return {
          ...prev,
          newVariantForm: { ...prev.newVariantForm, [name]: numericValue },
          variantErrors: { ...prev.variantErrors, [name]: undefined },
        };
      }
    });
  };

  const handleVariantSelectChange = (name: string, value: string, variantIndex?: number) => {
    setFormState((prev) => {
      if (variantIndex !== undefined) {
        return {
          ...prev,
          productVariants: prev.productVariants.map((v, i) =>
            i === variantIndex ? { ...v, [name]: value } : v
          ),
          variantErrors: { ...prev.variantErrors, [name]: undefined },
          errors: { ...prev.errors, variants: undefined },
        };
      } else {
        return {
          ...prev,
          newVariantForm: { ...prev.newVariantForm, [name]: value },
          variantErrors: { ...prev.variantErrors, [name]: undefined },
        };
      }
    });
  };

  const handleAddVariant = () => {
    const newErrors = validateVariantForm(formState.newVariantForm);
    if (Object.keys(newErrors).length > 0) {
      setFormState((prev) => ({ ...prev, variantErrors: newErrors }));
      setNotification({
        open: true,
        message: "Please fix the errors in the new variant form.",
        severity: "error",
      });
      return;
    }

    const newVariant: ProductVariantRequest = {
      price: formState.newVariantForm.price,
      stockQuantity: formState.newVariantForm.stockQuantity,
      colorId: formState.newVariantForm.colorId,
      sizeId: formState.newVariantForm.sizeId,
    };

    setFormState((prev) => ({
      ...prev,
      productVariants: [...prev.productVariants, newVariant],
      newVariantForm: { price: 0, stockQuantity: 0, colorId: "", sizeId: "" },
      variantErrors: {},
      errors: { ...prev.errors, variants: undefined },
    }));
  };

  const handleDeleteVariant = (variantIndex: number) => {
    setFormState((prev) => {
      const variantId = prev.productVariants[variantIndex]?.id;
      return {
        ...prev,
        productVariants: prev.productVariants.filter((_, i) => i !== variantIndex),
        deletedVariantIds: variantId ? [...prev.deletedVariantIds, variantId] : prev.deletedVariantIds,
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setFormState((prev) => {
      if (active.id.toString().startsWith("new-")) {
        const oldIndex = prev.formData.formImages.findIndex((_, i) => `new-${i}` === active.id);
        const newIndex = prev.formData.formImages.findIndex((_, i) => `new-${i}` === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          return {
            ...prev,
            formData: { ...prev.formData, formImages: arrayMove(prev.formData.formImages, oldIndex, newIndex) },
          };
        }
      } else {
        const oldIndex = prev.formData.existingImages.findIndex((img) => img.id === active.id);
        const newIndex = prev.formData.existingImages.findIndex((img) => img.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          return {
            ...prev,
            formData: { ...prev.formData, existingImages: arrayMove(prev.formData.existingImages, oldIndex, newIndex) },
          };
        }
      }
      return prev;
    });
  };

  const buildProductFormData = () => {
    const productFormData = new FormData();
    productFormData.append("Name", formState.formData.name);
    productFormData.append("Description", formState.formData.description);
    productFormData.append("InStock", formState.formData.inStock.toString());
    productFormData.append("IsFeatured", formState.formData.isFeatured.toString());
    productFormData.append("BrandId", formState.formData.brandId);
    productFormData.append("IsNotHadVariants", formState.formData.isNotHadVariants.toString());
    if (formState.formData.isNotHadVariants) {
      productFormData.append("DefaultVariantPrice", formState.formData.defaultVariantPrice.toString());
      productFormData.append("DefaultVariantStockQuantity", formState.formData.defaultVariantStockQuantity.toString());
    }

    formState.formData.categoryIds.forEach((categoryId, index) => {
      productFormData.append(`CategoryIds[${index}]`, categoryId);
    });

    formState.formData.formImages.forEach((file) => {
      productFormData.append(`FormImages`, file);
    });

    formState.formData.existingImages.forEach((image, index) => {
      productFormData.append(`Images[${index}].Id`, image.id);
    });

    return productFormData;
  };

  const buildVariantFormData = (variant: ProductVariantRequest, productId: string) => {
    const variantFormData = new FormData();
    variantFormData.append("Price", variant.price.toString());
    variantFormData.append("StockQuantity", variant.stockQuantity.toString());
    variantFormData.append("ProductId", productId);
    variantFormData.append("ColorId", variant.colorId);
    variantFormData.append("SizeId", variant.sizeId);
    return variantFormData;
  };

  const handleSaveProduct = async () => {
    if (!validateForm()) {
      setNotification({
        open: true,
        message: "Please fix the errors in the form before saving.",
        severity: "error",
      });
      return;
    }

    if (!formState.formData.isNotHadVariants) {
      const variantValidationErrors = formState.productVariants
        .map((variant, index) => ({ index, errors: validateVariantForm(variant) }))
        .filter((v) => Object.keys(v.errors).length > 0);

      if (variantValidationErrors.length > 0) {
        setNotification({
          open: true,
          message: "Please fix the errors in the variant forms.",
          severity: "error",
        });
        return;
      }
    }

    try {
      const productFormData = buildProductFormData();
      let product: Product;

      if (selectedProductId) {
        product = await updateProduct({ id: selectedProductId, data: productFormData }).unwrap();

        for (const variantId of formState.deletedVariantIds) {
          if (variantId) await deleteProductVariant(variantId).unwrap();
        }

        if (!formState.formData.isNotHadVariants) {
          for (const variant of formState.productVariants) {
            const variantFormData = buildVariantFormData(variant, product.id);
            if (variant.id) {
              await updateProductVariant({ id: variant.id, data: variantFormData }).unwrap();
            } else {
              await createProductVariant(variantFormData).unwrap();
            }
          }
        }

        setNotification({
          open: true,
          message: "Product updated successfully",
          severity: "success",
        });
      } else {
        product = await createProduct(productFormData).unwrap();

        if (!formState.formData.isNotHadVariants) {
          for (const variant of formState.productVariants) {
            const variantFormData = buildVariantFormData(variant, product.id);
            await createProductVariant(variantFormData).unwrap();
          }
        }

        setNotification({
          open: true,
          message: "Product created successfully",
          severity: "success",
        });
      }

      if (selectedProductId) {
        await refetchProduct();
      }
      refetch();
      handleCloseForm();
    } catch (err) {
      console.error("Failed to save product:", err);
      setNotification({
        open: true,
        message: "Failed to save product",
        severity: "error",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (selectedProductId) {
      try {
        await deleteProduct(selectedProductId).unwrap();
        dispatch(setSelectedProductId(null));
        setSelectedProductIds((prev) => prev.filter((id) => id !== selectedProductId));
        setNotification({
          open: true,
          message: "Product deleted successfully",
          severity: "success",
        });
        handleCloseDeleteDialog();
      } catch (err) {
        console.error("Failed to delete product:", err);
        setNotification({
          open: true,
          message: "Failed to delete product",
          severity: "error",
        });
      }
    }
  };

  const handleDeleteAllSelected = async () => {
    try {
      for (const id of selectedProductIds) {
        await deleteProduct(id).unwrap();
      }
      setSelectedProductIds([]);
      setNotification({
        open: true,
        message: `${selectedProductIds.length} product${selectedProductIds.length > 1 ? "s" : ""} deleted successfully`,
        severity: "success",
      });
    } catch (err) {
      console.error("Failed to delete products:", err);
      setNotification({
        open: true,
        message: "Failed to delete some products",
        severity: "error",
      });
    }
  };

  const handleCheckboxChange = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const handleSelectAllChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const allProductIds = data?.items?.map((product: Product) => product.id) || [];
      setSelectedProductIds(allProductIds);
    } else {
      setSelectedProductIds([]);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    debouncedSearch(value);
  };

  const handleClearSearch = () => {
    setSearch("");
    dispatch(setParams({ searchTerm: undefined }));
    dispatch(setPageNumber(1));
  };

  const handleCreateClick = useCallback(() => {
    dispatch(setSelectedProductId(null));
    dispatch(setCreateFormOpen(true));
  }, [dispatch]);

  const handleEditClick = useCallback((product: Product) => {
    dispatch(setSelectedProductId(product.id));
    dispatch(setCreateFormOpen(true));
  }, [dispatch]);

  const handleDeleteClick = useCallback((id: string) => {
    dispatch(setSelectedProductId(id));
    dispatch(setDeleteDialogOpen(true));
  }, [dispatch]);

  const handleCloseForm = useCallback(() => {
    dispatch(setCreateFormOpen(false));
    dispatch(setSelectedProductId(null));
    setAnchorEl(null);
    setFormState({
      formData: {
        name: "",
        description: "",
        inStock: true,
        isFeatured: false,
        brandId: "",
        categoryIds: [],
        formImages: [],
        existingImages: [],
        isNotHadVariants: true,
        defaultVariantPrice: 0,
        defaultVariantStockQuantity: 0,
      },
      selectedCategoryIds: [],
      productVariants: [],
      deletedImageIds: [],
      deletedVariantIds: [],
      errors: {},
      newVariantForm: { price: 0, stockQuantity: 0, colorId: "", sizeId: "" },
      variantErrors: {},
    });
  }, [dispatch]);

  const handleCloseDeleteDialog = useCallback(() => {
    dispatch(setDeleteDialogOpen(false));
    dispatch(setSelectedProductId(null));
  }, [dispatch]);

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const calculateStartIndex = (pagination: PaginationParams | undefined) => {
    if (!pagination) return 0;
    return (pagination.currentPage - 1) * pagination.pageSize + 1;
  };

  const calculateEndIndex = (pagination: PaginationParams | undefined) => {
    if (!pagination) return 0;
    const endIndex = pagination.currentPage * pagination.pageSize;
    return endIndex > pagination.totalCount ? pagination.totalCount : endIndex;
  };

  const getTotalStock = (product: Product): number => {
    return product.productVariants.reduce((total: number, variant: ProductVariant) => total + variant.stockQuantity, 0);
  };

  const getVariantCount = (product: Product): number => {
    return product.productVariants.length;
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", padding: 5 }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ marginLeft: 2 }}>
          Loading products...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ padding: 3, margin: 2, backgroundColor: "#fff" }}>
        <Typography variant="h6" color="error">
          Error loading products
        </Typography>
        <Typography variant="body2" sx={{ marginTop: 1 }}>
          Please try again later or contact support.
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          variant="outlined"
          color="primary"
          sx={{ marginTop: 2 }}
          onClick={() => refetch()}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 3, margin: "auto", maxWidth: "100%" }}>
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: "100%" }}>
          {notification.message}
        </Alert>
      </Snackbar>

      <Box sx={{ marginBottom: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold", marginBottom: 1 }}>
          Product Management
        </Typography>
        <Typography variant="body1">Manage your products and their variants</Typography>
      </Box>

      <Paper sx={{ elevation: 2, padding: 3, marginBottom: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
          <TextField
            placeholder="Search products..."
            value={search}
            onChange={handleSearchChange}
            variant="outlined"
            size="small"
            sx={{ width: { xs: "100%", sm: "300px" }, "& input": { paddingLeft: 4 } }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
              endAdornment: search && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleClearSearch}><ClearIcon /></IconButton>
                </InputAdornment>
              ),
            }}
            disabled={isFetching}
          />
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {selectedProductIds.length > 0 && (
              <Button
                variant="contained"
                color="error"
                onClick={handleDeleteAllSelected}
                sx={{ borderRadius: "12px", textTransform: "inherit" }}
                disabled={isDeleting}
              >
                Delete Selected ({selectedProductIds.length})
              </Button>
            )}
            <Button
              variant="contained"
              color="primary"
              onClick={handleCreateClick}
              startIcon={<AddCircleIcon />}
              sx={{ borderRadius: "12px", textTransform: "inherit" }}
            >
              Add Product
            </Button>
          </Box>
        </Box>

        <TableContainer component={Paper} elevation={0} sx={{ overflowX: "auto", border: 1, borderColor: "grey.300", borderRadius: 1 }}>
          <Table sx={{ minWidth: 1000, tableLayout: "auto" }}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ width: "5%" }}>
                  <Checkbox
                    checked={(data?.items?.length ?? 0) > 0 && selectedProductIds.length === data?.items.length}
                    indeterminate={selectedProductIds.length > 0 && selectedProductIds.length < (data?.items?.length ?? 0)}
                    onChange={handleSelectAllChange}
                  />
                </TableCell>
                <TableCell sx={{ width: "20%", whiteSpace: "normal" }}>Product Name</TableCell>
                <TableCell sx={{ width: "15%", whiteSpace: "normal" }}>Brand</TableCell>
                <TableCell sx={{ width: "15%" }}>Price Range</TableCell>
                <TableCell sx={{ width: "10%" }}>Variants</TableCell>
                <TableCell align="center" sx={{ width: "10%" }}>Stock Status</TableCell>
                <TableCell align="center" sx={{ width: "10%" }}>Total Stock</TableCell>
                <TableCell align="center" sx={{ width: "15%" }}>Rating</TableCell>
                <TableCell sx={{ width: "15%", whiteSpace: "normal" }}>Categories</TableCell>
                <TableCell align="center" sx={{ width: "10%" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.items.map((product: Product) => (
                <TableRow key={product.id}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedProductIds.includes(product.id)}
                      onChange={() => handleCheckboxChange(product.id)}
                    />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "normal" }}>
                    <Tooltip title={product.name}>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        {product.productImages && product.productImages.length > 0 ? (
                          <Box
                            component="img"
                            src={product.productImages[0].imageUrl}
                            alt={product.name}
                            sx={{ width: 40, height: 40, marginRight: 1, objectFit: "cover", borderRadius: "4px" }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              marginRight: 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: "#f0f0f0",
                              borderRadius: "4px",
                            }}
                          >
                            <InventoryIcon color="disabled" fontSize="small" />
                          </Box>
                        )}
                        <Box sx={{ maxWidth: { xs: "100%", sm: "200px" } }}>
                          <Typography
                            variant="body1"
                            sx={{ fontWeight: "medium", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "normal" }}
                          >
                            {product.name}
                          </Typography>
                        </Box>
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "normal" }}>
                    <Tooltip title={product.brand.description || "N/A"}>
                      <Typography
                        variant="body2"
                        sx={{ maxWidth: { xs: "100%", sm: "150px" }, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "normal" }}
                      >
                        {product.brand.name}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {formatVND(product.minPrice)} - {formatVND(product.maxPrice)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setViewingVariants(product)}
                      startIcon={<EyeIcon />}
                      sx={{ textTransform: "none" }}
                    >
                      {getVariantCount(product)} variants
                    </Button>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={product.inStock ? "In Stock" : "Out of Stock"}
                      size="small"
                      color={product.inStock ? "success" : "error"}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{getTotalStock(product)}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Rating value={product.averageRating} precision={0.5} size="small" readOnly />
                      <Typography variant="body2" sx={{ marginLeft: 1 }}>({product.averageRating.toFixed(1)})</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "normal" }}>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {product.categories.map((category) => (
                        <Chip
                          key={category.id}
                          label={category.name}
                          size="small"
                          sx={{ fontSize: "0.75rem" }}
                          color={category.subCategories.length > 0 ? "error" : "success"}
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: "flex", justifyContent: "center", gap: 1, flexWrap: "wrap" }}>
                      <Tooltip title="Copy ID">
                        <IconButton size="small" color="inherit" onClick={() => handleCopyId(product.id)}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" color="primary" onClick={() => handleEditClick(product)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View Variants">
                        <IconButton size="small" color="primary" onClick={() => setViewingVariants(product)}>
                          <EyeIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDeleteClick(product.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {(!data?.items || data.items.length === 0) && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ paddingY: 3 }}>
                    <Typography variant="body1" color="textSecondary">
                      {search ? `No products found for "${search}"` : "No products found"}
                    </Typography>
                    {search && (
                      <Button startIcon={<ClearIcon />} onClick={handleClearSearch} sx={{ marginTop: 2 }}>
                        Clear Search
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {data?.pagination && data.items.length > 0 && (
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 3, flexWrap: "wrap" }}>
            <Typography variant="body2" color="textSecondary">
              Showing {calculateStartIndex(data.pagination)} - {calculateEndIndex(data.pagination)} of {data.pagination.totalCount} products
            </Typography>
            <Pagination
              count={data.pagination.totalPages}
              page={data.pagination.currentPage}
              onChange={handlePageChange}
              color="primary"
              shape="rounded"
            />
          </Box>
        )}
      </Paper>

      <Dialog open={isCreateFormOpen} onClose={handleCloseForm} fullWidth maxWidth="md">
        <DialogTitle>
          {selectedProductId ? "Edit Product" : "Create New Product"}
          <IconButton aria-label="close" onClick={handleCloseForm} sx={{ position: "absolute", right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {isLoadingProduct || isLoadingCategories || isLoadingBrands || isLoadingSizes || isLoadingColors ? (
            <Box sx={{ display: "flex", justifyContent: "center", padding: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              {selectedProductId && (
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Product ID"
                    fullWidth
                    value={selectedProductId}
                    margin="normal"
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
              )}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="name"
                  label="Product Name"
                  fullWidth
                  required
                  value={formState.formData.name || ""}
                  onChange={handleInputChange}
                  margin="normal"
                  error={!!formState.errors.name}
                  helperText={formState.errors.name}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth margin="normal" error={!!formState.errors.brandId}>
                  <InputLabel id="brand-label">Brand</InputLabel>
                  <Select
                    labelId="brand-label"
                    label="Brand"
                    value={formState.formData.brandId || ""}
                    onChange={handleBrandChange}
                  >
                    {brandsData?.map((brand: Brand) => (
                      <MenuItem key={brand.id} value={brand.id}>{brand.name}</MenuItem>
                    ))}
                  </Select>
                  {formState.errors.brandId && (
                    <Typography variant="body2" color="error">{formState.errors.brandId}</Typography>
                  )}
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  name="description"
                  label="Description"
                  fullWidth
                  multiline
                  rows={4}
                  value={formState.formData.description || ""}
                  onChange={handleInputChange}
                  margin="normal"
                  error={!!formState.errors.description}
                  helperText={formState.errors.description}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="categories-label">Categories</InputLabel>
                  <Select
                    labelId="categories-label"
                    open={Boolean(anchorEl)}
                    onOpen={(event) => setAnchorEl(event.currentTarget as HTMLElement)}
                    onClose={() => setAnchorEl(null)}
                    value={formState.selectedCategoryIds.map((item) => item.id)}
                    multiple
                    renderValue={() => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {formState.selectedCategoryIds.map((category) => (
                          <Chip
                            key={category.id}
                            label={category.name}
                            size="small"
                            sx={{ backgroundColor: "grey.200", color: "text.primary" }}
                          />
                        ))}
                      </Box>
                    )}
                    MenuProps={{ PaperProps: { sx: { minWidth: 200 } } }}
                  >
                    <CategoryMenu
                      categories={categoriesData || []}
                      depth={0}
                      selectedCategoryIds={formState.selectedCategoryIds}
                      onSelect={handleCategorySelect}
                    />
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControlLabel
                  control={
                    <Switch
                      name="inStock"
                      checked={formState.formData.inStock || false}
                      onChange={handleSwitchChange}
                      color="primary"
                    />
                  }
                  label="In Stock"
                />
                <FormControlLabel
                  control={
                    <Switch
                      name="isFeatured"
                      checked={formState.formData.isFeatured || false}
                      onChange={handleSwitchChange}
                      color="primary"
                    />
                  }
                  label="Featured"
                />
                <FormControlLabel
                  control={
                    <Switch
                      name="isNotHadVariants"
                      checked={formState.formData.isNotHadVariants || false}
                      onChange={handleSwitchChange}
                      color="primary"
                    />
                  }
                  label="No Variants"
                />
              </Grid>
              {formState.formData.isNotHadVariants && (
                <>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      name="defaultVariantPrice"
                      label="Price (VND)"
                      type="number"
                      fullWidth
                      value={formState.formData.defaultVariantPrice || 0}
                      onChange={handlePriceQuantityChange}
                      margin="normal"
                      InputProps={{
                        endAdornment: <InputAdornment position="end">₫</InputAdornment>,
                        inputProps: { step: 1, min: 0 },
                      }}
                      error={!!formState.errors.defaultVariantPrice}
                      helperText={formState.errors.defaultVariantPrice}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      name="defaultVariantStockQuantity"
                      label="Stock Quantity"
                      type="number"
                      fullWidth
                      value={formState.formData.defaultVariantStockQuantity || 0}
                      onChange={handlePriceQuantityChange}
                      margin="normal"
                      InputProps={{ inputProps: { step: 1, min: 0 } }}
                      error={!!formState.errors.defaultVariantStockQuantity}
                      helperText={formState.errors.defaultVariantStockQuantity}
                    />
                  </Grid>
                </>
              )}
              <Grid size={{ xs: 12 }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadIcon />}
                  sx={{ marginTop: 2 }}
                >
                  Upload Product Images
                  <input
                    type="file"
                    hidden
                    multiple
                    accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
                    onChange={handleFileChange}
                  />
                </Button>
                {formState.errors.formImages && (
                  <Typography variant="body2" color="error" sx={{ marginTop: 1 }}>
                    {formState.errors.formImages}
                  </Typography>
                )}
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
                  {formState.formData.formImages.length > 0 && (
                    <Box sx={{ marginTop: 2 }}>
                      <Typography variant="body2">Uploaded Product Images (Drag to reorder):</Typography>
                      <SortableContext
                        items={formState.formData.formImages.map((_, index) => `new-${index}`)}
                        strategy={rectSortingStrategy}
                      >
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, marginTop: 1 }}>
                          {formState.formData.formImages.map((file, index) => (
                            <SortableImage
                              key={`new-${index}`}
                              id={`new-${index}`}
                              src={previewUrls[index] || "https://via.placeholder.com/80"}
                              alt={file.name}
                              onDelete={() => {
                                setPendingImageDelete({ type: "uploaded", index });
                                setImageDeleteDialogOpen(true);
                              }}
                            />
                          ))}
                        </Box>
                      </SortableContext>
                    </Box>
                  )}
                  {selectedProductId && formState.formData.existingImages.length > 0 && (
                    <Box sx={{ marginTop: 2 }}>
                      <Typography variant="body2">Current Product Images (Drag to reorder):</Typography>
                      {formState.errors.existingImages && (
                        <Typography variant="body2" color="error" sx={{ marginTop: 1 }}>
                          {formState.errors.existingImages}
                        </Typography>
                      )}
                      <SortableContext
                        items={formState.formData.existingImages.map((image) => image.id)}
                        strategy={rectSortingStrategy}
                      >
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, marginTop: 1 }}>
                          {formState.formData.existingImages.map((image) => {
                            const productImage = selectedProduct?.productImages.find((img) => img.id === image.id);
                            return (
                              <SortableImage
                                key={image.id}
                                id={image.id}
                                src={productImage?.imageUrl || "https://via.placeholder.com/80"}
                                alt="Product"
                                onDelete={() => {
                                  setPendingImageDelete({ type: "existing", imageId: image.id });
                                  setImageDeleteDialogOpen(true);
                                }}
                              />
                            );
                          })}
                        </Box>
                      </SortableContext>
                    </Box>
                  )}
                </DndContext>
              </Grid>
              {!formState.formData.isNotHadVariants && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="h6" sx={{ marginTop: 2, marginBottom: 1 }}>
                    Product Variants
                  </Typography>
                  {formState.errors.variants && (
                    <Typography variant="body2" color="error" sx={{ marginBottom: 1 }}>
                      {formState.errors.variants}
                    </Typography>
                  )}
                  {formState.productVariants.length > 0 && (
                    <TableContainer component={Paper} elevation={0}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Size</TableCell>
                            <TableCell>Color</TableCell>
                            <TableCell>Price</TableCell>
                            <TableCell>Stock</TableCell>
                            <TableCell align="center">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {formState.productVariants.map((variant, index) => {
                            const variantErrors = validateVariantForm(variant);
                            return (
                              <TableRow key={index}>
                                <TableCell>
                                  <FormControl fullWidth margin="normal" error={!!variantErrors.sizeId}>
                                    <InputLabel id={`variant-size-label-${index}`}>Size</InputLabel>
                                    <Select
                                      labelId={`variant-size-label-${index}`}
                                      label="Size"
                                      value={variant.sizeId || ""}
                                      onChange={(event) => handleVariantSelectChange("sizeId", event.target.value, index)}
                                    >
                                      {sizesData?.map((size: Size) => (
                                        <MenuItem key={size.id} value={size.id}>{size.name}</MenuItem>
                                      ))}
                                    </Select>
                                    {variantErrors.sizeId && (
                                      <Typography variant="body2" color="error">{variantErrors.sizeId}</Typography>
                                    )}
                                  </FormControl>
                                </TableCell>
                                <TableCell>
                                  <FormControl fullWidth margin="normal" error={!!variantErrors.colorId}>
                                    <InputLabel id={`variant-color-label-${index}`}>Color</InputLabel>
                                    <Select
                                      labelId={`variant-color-label-${index}`}
                                      label="Color"
                                      value={variant.colorId || ""}
                                      onChange={(event) => handleVariantSelectChange("colorId", event.target.value, index)}
                                    >
                                      {colorsData?.map((color: Color) => (
                                        <MenuItem key={color.id} value={color.id}>{color.name}</MenuItem>
                                      ))}
                                    </Select>
                                    {variantErrors.colorId && (
                                      <Typography variant="body2" color="error">{variantErrors.colorId}</Typography>
                                    )}
                                  </FormControl>
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    name="price"
                                    label="Price (VND)"
                                    type="number"
                                    fullWidth
                                    value={variant.price || 0}
                                    onChange={(e) => handleVariantInputChange(e as React.ChangeEvent<HTMLInputElement>, index)}
                                    margin="normal"
                                    InputProps={{
                                      endAdornment: <InputAdornment position="end">₫</InputAdornment>,
                                      inputProps: { step: 1, min: 0 },
                                    }}
                                    error={!!variantErrors.price}
                                    helperText={variantErrors.price}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    name="stockQuantity"
                                    label="Stock"
                                    type="number"
                                    fullWidth
                                    value={variant.stockQuantity || 0}
                                    onChange={(e) => handleVariantInputChange(e as React.ChangeEvent<HTMLInputElement>, index)}
                                    margin="normal"
                                    InputProps={{ inputProps: { step: 1, min: 0 } }}
                                    error={!!variantErrors.stockQuantity}
                                    helperText={variantErrors.stockQuantity}
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <IconButton size="small" color="error" onClick={() => handleDeleteVariant(index)}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                  <Box sx={{ marginTop: 2, padding: 2, backgroundColor: "grey.100", borderRadius: 1 }}>
                    <Typography variant="h6" sx={{ marginBottom: 1 }}>Add New Variant</Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 3 }}>
                        <FormControl fullWidth margin="normal" error={!!formState.variantErrors.sizeId}>
                          <InputLabel id="new-variant-size-label">Size</InputLabel>
                          <Select
                            labelId="new-variant-size-label"
                            label="Size"
                            value={formState.newVariantForm.sizeId || ""}
                            onChange={(event) => handleVariantSelectChange("sizeId", event.target.value)}
                          >
                            {sizesData?.map((size: Size) => (
                              <MenuItem key={size.id} value={size.id}>{size.name}</MenuItem>
                            ))}
                          </Select>
                          {formState.variantErrors.sizeId && (
                            <Typography variant="body2" color="error">{formState.variantErrors.sizeId}</Typography>
                          )}
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 3 }}>
                        <FormControl fullWidth margin="normal" error={!!formState.variantErrors.colorId}>
                          <InputLabel id="new-variant-color-label">Color</InputLabel>
                          <Select
                            labelId="new-variant-color-label"
                            label="Color"
                            value={formState.newVariantForm.colorId || ""}
                            onChange={(event) => handleVariantSelectChange("colorId", event.target.value)}
                          >
                            {colorsData?.map((color: Color) => (
                              <MenuItem key={color.id} value={color.id}>{color.name}</MenuItem>
                            ))}
                          </Select>
                          {formState.variantErrors.colorId && (
                            <Typography variant="body2" color="error">{formState.variantErrors.colorId}</Typography>
                          )}
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 3 }}>
                        <TextField
                          name="price"
                          label="Price (VND)"
                          type="number"
                          fullWidth
                          value={formState.newVariantForm.price || 0}
                          onChange={handleVariantInputChange}
                          margin="normal"
                          InputProps={{
                            endAdornment: <InputAdornment position="end">₫</InputAdornment>,
                            inputProps: { step: 1, min: 0 },
                          }}
                          error={!!formState.variantErrors.price}
                          helperText={formState.variantErrors.price}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 3 }}>
                        <TextField
                          name="stockQuantity"
                          label="Stock"
                          type="number"
                          fullWidth
                          value={formState.newVariantForm.stockQuantity || 0}
                          onChange={handleVariantInputChange}
                          margin="normal"
                          InputProps={{ inputProps: { step: 1, min: 0 } }}
                          error={!!formState.variantErrors.stockQuantity}
                          helperText={formState.variantErrors.stockQuantity}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 2 }}>
                        <Button
                          variant="contained"
                          onClick={handleAddVariant}
                          sx={{ marginTop: 2, textTransform: "none" }}
                          fullWidth
                        >
                          Add Variant
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm} variant="outlined">Cancel</Button>
          <Button
            onClick={handleSaveProduct}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={isCreatingProduct || isUpdatingProduct || isCreatingVariant || isUpdatingVariant || isDeletingVariant}
          >
            {(isCreatingProduct || isUpdatingProduct || isCreatingVariant || isUpdatingVariant || isDeletingVariant) ? (
              <CircularProgress size={24} color="inherit" />
            ) : selectedProductId ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this product and all its variants? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} variant="outlined">Cancel</Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? <CircularProgress size={24} color="inherit" /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={imageDeleteDialogOpen} onClose={handleCloseImageDeleteDialog}>
        <DialogTitle>Confirm Image Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this image? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseImageDeleteDialog} variant="outlined">Cancel</Button>
          <Button
            onClick={handleConfirmImageDelete}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmNoVariantsDialogOpen} onClose={handleCancelNoVariants}>
        <DialogTitle>Confirm No Variants</DialogTitle>
        <DialogContent>
          <Typography>
            Enabling 'No Variants' will delete all existing variants except the default variant (if any). This action cannot be undone. Are you sure you want to proceed?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelNoVariants} variant="outlined">Cancel</Button>
          <Button
            onClick={handleConfirmNoVariants}
            color="primary"
            variant="contained"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <VariantDialog
        open={!!viewingVariants}
        onOpenChange={() => setViewingVariants(null)}
        product={viewingVariants}
      />
    </Box>
  );
}