import { useState } from "react";
import {
  Box,
  MenuItem,
  Typography,
  IconButton,
  Popover,
} from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { Category } from "../../app/models/responses/category";

interface CategoryMenuProps {
  categories: Category[];
  depth: number;
  selectedCategoryIds: { id: string; name: string }[];
  onSelect: (categoryId: string, categoryName: string) => void;
}

export const CategoryMenu = ({ categories, depth, selectedCategoryIds, onSelect }: CategoryMenuProps) => {
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