import { AnimatePresence, motion } from "framer-motion";
import FieldWrap from "../form/FieldWrap";
import Input from "../form/Input";
import Button from "../ui/Button";
import { Dispatch, ReactNode, SetStateAction, useState } from "react";
import classNames from "classnames";


function AnimacionDeInputModoMovil({globalFilter, setGlobalFilter, children, anchoInput} : {globalFilter: string, setGlobalFilter: Dispatch<SetStateAction<string>>, children?: ReactNode, anchoInput?: number}) {
    const [buscarAbierto, setBuscarAbierto] = useState<boolean>(false)

    return (
        <>
            <div className="block md:hidden relative">
                <AnimatePresence mode="wait">
                    {buscarAbierto ? (
                        <motion.div
                            key="search-field"
                            className="flex gap-4"
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.3 }}
                        >
                            {children}
                            <FieldWrap
                                lastSuffix={
                                    <Button
                                    icon="HeroXMark"
                                    color="red"
                                    onClick={() => {setBuscarAbierto(false); setGlobalFilter("")}}
                                    />
                                }
                            >
                                <Input
                                    className={classNames(anchoInput ? `max-w-[${anchoInput}px]` : "max-w-[150px]")}
                                    name="globalFilter"
                                    placeholder="Buscar..."
                                    value={globalFilter}
                                    onChange={(e) => {setGlobalFilter(e.target.value)}}
                                />
                            </FieldWrap>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="search-button"
                            className="flex gap-4"
                            initial={false}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            transition={{ duration: 0.3 }}
                        >
                            {children}
                            <Button
                                variant="solid"
                                icon="DuoSearch"
                                color="zinc"
                                onClick={() => {setBuscarAbierto(true)}}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <div className={classNames("hidden", children ? "md:flex md:gap-4" : "md:block")}>
                {children}
                <Input
                    name="globalFilter"
                    placeholder="Buscar..."
                    value={globalFilter}
                    onChange={(e) => {setGlobalFilter(e.target.value)}}
                />
            </div>
        </>
    )
}

export default AnimacionDeInputModoMovil